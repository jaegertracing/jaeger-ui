// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const proxyConfig = {
  target: 'http://localhost:16686',
  secure: false,
  changeOrigin: true,
  ws: true,
  xfwd: true,
};

/**
 * Vite plugin to inject UI config during development.
 * Fetches real capabilities from the running backend, then overlays local overrides.
 * Mimics the behavior of the Go query-service which injects config into index.html.
 *
 * Config precedence:
 *   1. Backend /api/ui/config (base layer — capabilities, version, uiConfig)
 *   2. jaeger-ui.config.json (override layer — merged on top of backend uiConfig)
 *   3. jaeger-ui.config.js  (full control — replaces uiConfig entirely)
 *
 * The plugin only runs in development mode (npm start).
 * Falls back silently to defaults if backend is not running.
 *
 * Security note: Local config files are excluded from git via .gitignore.
 */

// Reuse the proxy target so the backend origin is defined in one place.
const BACKEND_ORIGIN = proxyConfig.target;

// Cache backend config for CACHE_TTL_MS to avoid a fetch on every HMR request.
// The timestamp is updated on every attempt (success or failure) so that a
// down/slow backend does not trigger a fetch on every HMR page transform.
let cachedBackendConfig: Record<string, any> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;
const FETCH_TIMEOUT_MS = 3_000;

/**
 * Fetch UI config from the running Jaeger backend.
 * Returns null (silently) if the backend is unavailable or the endpoint does not exist yet.
 * Negative results are cached for CACHE_TTL_MS to prevent a fetch on every HMR request
 * when the backend is not running.
 */
let inFlightConfigPromise: Promise<Record<string, any> | null> | null = null;

/**
 * Fetch UI config from the running Jaeger backend.
 * Returns null (silently) if the backend is unavailable or the endpoint does not exist yet.
 * Caches the in-flight promise so concurrent HMR transforms share the same network request.
 * Negative results are cached for CACHE_TTL_MS to prevent a fetch on every HMR request
 * when the backend is not running.
 */
async function fetchBackendConfig(): Promise<Record<string, any> | null> {
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedBackendConfig;
  }

  // If a request is already in-flight, return the same promise to share the result
  if (inFlightConfigPromise) {
    return inFlightConfigPromise;
  }

  inFlightConfigPromise = (async () => {
    try {
      const res = await fetch(`${BACKEND_ORIGIN}/api/ui/config`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        cachedBackendConfig = (await res.json()) as Record<string, any>;
        console.log('[jaeger-ui-config] Fetched config from backend');
      }
    } catch {
      // Backend not running, timed out, or endpoint not yet available — expected during development.
    } finally {
      // Update timestamp ONLY after the fetch resolves (success or fail)
      cacheTimestamp = Date.now();
      inFlightConfigPromise = null;
    }
    return cachedBackendConfig;
  })();

  return inFlightConfigPromise;
}

function jaegerUiConfigPlugin() {
  const jsConfigPath = path.resolve(__dirname, 'jaeger-ui.config.js');
  const jsonConfigPath = path.resolve(__dirname, 'jaeger-ui.config.json');

  return {
    name: 'jaeger-ui-config',
    // Only run during `vite serve` (dev mode). Do not fetch backend config or inject
    // local files during `vite build` — production HTML is handled by the Go query-service.
    apply: 'serve' as const,
    configureServer(server) {
      server.watcher.add([jsConfigPath, jsonConfigPath]);
      server.watcher.on('change', path => {
        if (path === jsConfigPath || path === jsonConfigPath) {
          console.log(`[jaeger-ui-config] Config changed: ${path}. Triggering full reload...`);
          server.ws.send({ type: 'full-reload', path: '*' });
        }
      });
    },
    transformIndexHtml: {
      order: 'pre' as const,
      async handler(html: string) {
        // Fetch backend config (cached, silent fallback).
        const backendConfig = await fetchBackendConfig();

        // Optional: Parse the local config upfront if it exists so we can merge storageCapabilities
        let localConfig: Record<string, any> | null = null;
        if (fs.existsSync(jsonConfigPath)) {
          try {
            const localConfigContent = fs.readFileSync(jsonConfigPath, 'utf-8');
            localConfig = JSON.parse(localConfigContent);
          } catch (err) {
            console.error('[jaeger-ui-config] Error loading jaeger-ui.config.json:', err);
          }
        }

        // 1. Inject storageCapabilities: Local config takes precedence if present, otherwise fallback to backend config
        const finalStorageCapabilities =
          localConfig?.storageCapabilities ?? backendConfig?.storageCapabilities;
        if (finalStorageCapabilities) {
          html = html.replace(
            'const JAEGER_STORAGE_CAPABILITIES = DEFAULT_STORAGE_CAPABILITIES;',
            `const JAEGER_STORAGE_CAPABILITIES = { ...DEFAULT_STORAGE_CAPABILITIES, ...${JSON.stringify(finalStorageCapabilities)} };`
          );
        }

        // 2. Inject version from backend (no local override).
        if (backendConfig?.version) {
          html = html.replace(
            'const JAEGER_VERSION = DEFAULT_VERSION;',
            `const JAEGER_VERSION = ${JSON.stringify(backendConfig.version)};`
          );
        }

        // 3. Inject uiConfig: JS file takes full control, JSON overrides backend, backend is base.
        if (fs.existsSync(jsConfigPath)) {
          try {
            const jsContent = fs.readFileSync(jsConfigPath, 'utf-8');
            const uiConfigFn = `function UIConfig() { ${jsContent} }`;
            html = html.replace('// JAEGER_CONFIG_JS', uiConfigFn);
            console.log('[jaeger-ui-config] Loaded config from jaeger-ui.config.js');
            return html;
          } catch (err) {
            console.error('[jaeger-ui-config] Error loading jaeger-ui.config.js:', err);
          }
        }

        if (localConfig) {
          // Merge dynamic backend config with local overrides
          const mergedConfig = { ...(backendConfig?.uiConfig ?? {}), ...localConfig };

          // Inject the full UI config — mimics the Go server behavior for .json config files.
          html = html.replace(
            'const JAEGER_CONFIG = DEFAULT_CONFIG;',
            `const JAEGER_CONFIG = ${JSON.stringify(mergedConfig)};`
          );

          const source = backendConfig?.uiConfig
            ? 'backend + jaeger-ui.config.json'
            : 'jaeger-ui.config.json';
          console.log(`[jaeger-ui-config] Loaded config from ${source}`);
          return html;
        }

        if (backendConfig?.uiConfig) {
          html = html.replace(
            'const JAEGER_CONFIG = DEFAULT_CONFIG;',
            `const JAEGER_CONFIG = ${JSON.stringify(backendConfig.uiConfig)};`
          );
          console.log('[jaeger-ui-config] Loaded config from backend');
        }

        return html;
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __REACT_APP_GA_DEBUG__: JSON.stringify(process.env.REACT_APP_GA_DEBUG || ''),
    __REACT_APP_VSN_STATE__: JSON.stringify(process.env.REACT_APP_VSN_STATE || ''),
    __APP_ENVIRONMENT__: JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  plugins: [
    jaegerUiConfigPlugin(),
    react({
      babel: {
        babelrc: true,
      },
    }),
    legacy({
      targets: ['>0.5%', 'not dead', 'not ie <= 11', 'not op_mini all'],
    }),
  ],
  css: {
    preprocessorOptions: {
      less: {
        math: 'always',
        javascriptEnabled: true,
      },
    },
  },
  server: {
    proxy: {
      // Proxy jaeger-query resource paths for local development.
      '/api': proxyConfig,
      '/analytics': proxyConfig,
      '/serviceedges': proxyConfig,
      '/qualitymetrics-v2': proxyConfig,
    },
  },
  base: './',
  build: {
    outDir: 'build',
    assetsDir: 'static',
    commonjsOptions: {
      // Ensure we transform modules that contain a mix of ES imports
      // and CommonJS require() calls to avoid stray require() calls in production.
      transformMixedEsModules: true,
    },
  },
  resolve: {
    alias: {
      // allow hot reload of Plexus code -- https://github.com/jaegertracing/jaeger-ui/pull/2089
      '@jaegertracing/plexus': path.resolve(__dirname, '../plexus/src'),
    },
  },
});
