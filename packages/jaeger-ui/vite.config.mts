// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { mergeFields } from './src/constants/config-keys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const proxyConfig = {
  target: 'http://127.0.0.1:16686',
  secure: false,
  changeOrigin: true,
  ws: true,
  xfwd: true,
};

/**
 * Vite plugin to inject local UI config during development.
 * This mimics the behavior of the Go query-service which injects config into index.html.
 *
 * Supports two config file formats:
 * 1. jaeger-ui.config.js - JavaScript file that exports a config object (or function returning one)
 * 2. jaeger-ui.config.json - JSON file with config object
 *
 * The plugin only runs in development mode (npm start).
 *
 * Security note: These config files are local to the developer's machine and are
 * excluded from git via .gitignore. The content is injected into the HTML during
 * development only, similar to how the Go query-service injects config in production.
 */
function jaegerUiConfigPlugin() {
  const jsConfigPath = path.resolve(__dirname, 'jaeger-ui.config.js');
  const jsonConfigPath = path.resolve(__dirname, 'jaeger-ui.config.json');

  return {
    name: 'jaeger-ui-config',
    apply: 'serve' as const,
    configureServer(server: import('vite').ViteDevServer) {
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
        let backendUiConfig: any = null;
        let storageCapabilities: any = null;
        let version: any = null;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1000);

        try {
          const fetchOptions = { signal: controller.signal };
          const response = await fetch('http://127.0.0.1:16686/api/ui/config', fetchOptions);

          if (response?.ok) {
            const data = await response.json();

            // Extract data from unified response
            storageCapabilities = data.storageCapabilities;
            version = data.version;
            backendUiConfig = data.uiConfig;

            console.log('[jaeger-ui-config] Fetched config from backend /api/ui/config');
          }
        } catch (err) {
          // Silent fallback for production behavior, but log for dev visibility
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('[jaeger-ui-config] Backend fetch timed out (1s)');
          } else if (err instanceof Error) {
            console.log(`[jaeger-ui-config] Error fetching backend config: ${err.message}`, err);
          } else {
            console.log('[jaeger-ui-config] Unknown error fetching backend config:', err);
          }
        } finally {
          clearTimeout(timeout);
        }

        // Check for JS config first (highest priority - no merge)
        if (fs.existsSync(jsConfigPath)) {
          try {
            const jsContent = fs.readFileSync(jsConfigPath, 'utf-8');
            const uiConfigFn = `function UIConfig() { ${jsContent} }`;
            html = html.replace('// JAEGER_CONFIG_JS', uiConfigFn);
            console.log(
              '[jaeger-ui-config] Loaded config from jaeger-ui.config.js (full override, no merge)'
            );
            // Note: Don't return early here, we still need to inject storageCapabilities and version below
          } catch (err) {
            console.error('[jaeger-ui-config] Error loading jaeger-ui.config.js:', err);
          }
        } else {
          // Handle JSON config merged on top of backend UI config
          let finalUiConfig = backendUiConfig;

          if (fs.existsSync(jsonConfigPath)) {
            try {
              const jsonContent = fs.readFileSync(jsonConfigPath, 'utf-8');
              const parsedJsonConfig = JSON.parse(jsonContent);

              // Shallow merge: JSON on top of backend base
              finalUiConfig = { ...backendUiConfig, ...parsedJsonConfig };

              mergeFields.forEach(key => {
                if (
                  parsedJsonConfig &&
                  typeof parsedJsonConfig[key] === 'object' &&
                  parsedJsonConfig[key] !== null
                ) {
                  const backendValue = backendUiConfig ? backendUiConfig[key] : {};
                  finalUiConfig[key] = { ...backendValue, ...parsedJsonConfig[key] };
                }
              });

              console.log(
                '[jaeger-ui-config] Merged config from jaeger-ui.config.json on top of backend uiConfig'
              );
            } catch (err) {
              console.error('[jaeger-ui-config] Error loading jaeger-ui.config.json:', err);
            }
          } else if (backendUiConfig) {
            console.log('[jaeger-ui-config] Using backend uiConfig as base');
          }

          // Inject final UI config into index.html
          if (finalUiConfig) {
            html = html.replace(
              'const JAEGER_CONFIG = DEFAULT_CONFIG;',
              `const JAEGER_CONFIG = ${JSON.stringify(finalUiConfig)};`
            );
          }
        }

        // Inject storageCapabilities into index.html
        if (storageCapabilities) {
          html = html.replace(
            'const JAEGER_STORAGE_CAPABILITIES = DEFAULT_STORAGE_CAPABILITIES;',
            `const JAEGER_STORAGE_CAPABILITIES = ${JSON.stringify(storageCapabilities)};`
          );
        }

        // Inject version into index.html
        if (version) {
          html = html.replace(
            'const JAEGER_VERSION = DEFAULT_VERSION;',
            `const JAEGER_VERSION = ${JSON.stringify(version)};`
          );
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
