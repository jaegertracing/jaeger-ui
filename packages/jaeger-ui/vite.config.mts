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
 * Extends the existing local-file override mechanism to also fetch capabilities,
 * version, and uiConfig from the running backend during HTML transformation.
 *
 * Config precedence (highest to lowest):
 *   - storageCapabilities: backend (/api/ui/config) when available, falls back to jaeger-ui.config.json
 *   - version: from backend when available, otherwise not injected
 *   - uiConfig: backend as base, overlaid by jaeger-ui.config.json or .js
 *
 * Falls back silently to defaults if backend is not running.
 */
function jaegerUiConfigPlugin() {
  const jsConfigPath = path.resolve(__dirname, 'jaeger-ui.config.js');
  const jsonConfigPath = path.resolve(__dirname, 'jaeger-ui.config.json');

  // undefined = never attempted; null = attempted but backend unavailable; object = success
  let cachedBackendConfig: Record<string, any> | null | undefined = undefined;
  let cacheTimestamp = 0;
  const CACHE_TTL_MS = 30_000;
  // Abort the backend config fetch if it takes longer than this to avoid
  // blocking transformIndexHtml (and therefore page loads) indefinitely on a
  // stalled proxy, long TLS handshake, or slow network.
  const FETCH_TIMEOUT_MS = 3_000;

  async function fetchBackendConfig() {
    const now = Date.now();
    if (cachedBackendConfig !== undefined && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedBackendConfig;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(`${proxyConfig.target}/api/ui/config`, {
        signal: controller.signal,
      });
      if (response.ok) {
        cachedBackendConfig = await response.json();
        cacheTimestamp = Date.now();
        console.log('[jaeger-ui-config] Fetched config from backend');
      } else {
        // Non-2xx response (e.g. 404 if endpoint not yet implemented) — treat as unavailable
        cachedBackendConfig = null;
        cacheTimestamp = Date.now();
      }
    } catch {
      // Backend not running, request timed out, or aborted — cache the negative
      // result so we don't retry on every page load while the backend is down.
      cachedBackendConfig = null;
      cacheTimestamp = Date.now();
    } finally {
      clearTimeout(timeoutId);
    }
    return cachedBackendConfig;
  }

  function readLocalConfig(): Record<string, any> | null {
    // JS config takes full control of uiConfig (higher priority)
    if (fs.existsSync(jsConfigPath)) {
      try {
        return { __jsConfig: fs.readFileSync(jsConfigPath, 'utf-8') };
      } catch (err) {
        console.warn('[jaeger-ui-config] Failed to read jaeger-ui.config.js:', err);
      }
    }
    // JSON config merges on top of backend uiConfig
    if (fs.existsSync(jsonConfigPath)) {
      try {
        return JSON.parse(fs.readFileSync(jsonConfigPath, 'utf-8'));
      } catch (err) {
        console.warn('[jaeger-ui-config] Failed to parse jaeger-ui.config.json:', err);
      }
    }
    return null;
  }

  return {
    name: 'jaeger-ui-config',
    apply: 'serve' as const, // Only run during dev server — not during vite build
    configureServer(server: any) {
      server.watcher.add([jsConfigPath, jsonConfigPath]);
      server.watcher.on('change', (changedPath: string) => {
        if (changedPath === jsConfigPath || changedPath === jsonConfigPath) {
          console.log(`[jaeger-ui-config] Config changed: ${changedPath}. Triggering full reload...`);
          server.ws.send({ type: 'full-reload', path: '*' });
        }
      });
    },
    transformIndexHtml: {
      order: 'pre' as const,
      async handler(html: string) {
        const backendConfig = await fetchBackendConfig();
        const localConfig = readLocalConfig();

        // 1. Inject capabilities: backend takes precedence when present,
        //    fall back to local jaeger-ui.config.json when backend is unavailable.
        const storageCapabilities = backendConfig?.storageCapabilities ?? localConfig?.storageCapabilities;
        if (storageCapabilities) {
          html = html.replace(
            'const JAEGER_STORAGE_CAPABILITIES = DEFAULT_STORAGE_CAPABILITIES;',
            `const JAEGER_STORAGE_CAPABILITIES = ${JSON.stringify(storageCapabilities)};`
          );
        }

        // 2. Inject version from backend (no local override)
        if (backendConfig?.version) {
          html = html.replace(
            'const JAEGER_VERSION = DEFAULT_VERSION;',
            `const JAEGER_VERSION = ${JSON.stringify(backendConfig.version)};`
          );
        }

        // 3. Inject UI config: local overrides merged on top of backend config
        if (localConfig?.__jsConfig) {
          // JS config takes full control (existing behaviour, unchanged)
          const uiConfigFn = `function UIConfig() { ${localConfig.__jsConfig} }`;
          html = html.replace('// JAEGER_CONFIG_JS', uiConfigFn);
          console.log('[jaeger-ui-config] Loaded config from jaeger-ui.config.js');
        } else {
          const mergedUiConfig = {
            ...(backendConfig?.uiConfig ?? {}),
            ...(localConfig ?? {}),
          };
          if (Object.keys(mergedUiConfig).length > 0) {
            html = html.replace(
              'const JAEGER_CONFIG = DEFAULT_CONFIG;',
              `const JAEGER_CONFIG = ${JSON.stringify(mergedUiConfig)};`
            );
            const source =
              backendConfig?.uiConfig && localConfig
                ? 'backend + jaeger-ui.config.json'
                : backendConfig?.uiConfig
                  ? 'backend'
                  : 'jaeger-ui.config.json';
            console.log(`[jaeger-ui-config] Loaded config from ${source}`);
          }
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
