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
        // Check for JS config first (higher priority, like in Go server)
        if (fs.existsSync(jsConfigPath)) {
          try {
            const jsContent = fs.readFileSync(jsConfigPath, 'utf-8');
            // Replace the JAEGER_CONFIG_JS comment with UIConfig function
            // This mimics the Go server behavior for .js config files
            const uiConfigFn = `function UIConfig() { ${jsContent} }`;
            html = html.replace('// JAEGER_CONFIG_JS', uiConfigFn);
            console.log('[jaeger-ui-config] Loaded config from jaeger-ui.config.js');
            return html;
          } catch (err) {
            console.error('[jaeger-ui-config] Error loading jaeger-ui.config.js:', err);
          }
        }

        // Check for JSON config
        if (fs.existsSync(jsonConfigPath)) {
          try {
            const jsonContent = fs.readFileSync(jsonConfigPath, 'utf-8');
            // Validate it's valid JSON and use stringified result for injection
            const parsedConfig = JSON.parse(jsonContent);
            // Replace DEFAULT_CONFIG with the JSON content
            // This mimics the Go server behavior for .json config files
            html = html.replace(
              'const JAEGER_CONFIG = DEFAULT_CONFIG;',
              `const JAEGER_CONFIG = ${JSON.stringify(parsedConfig)};`
            );
            console.log('[jaeger-ui-config] Loaded config from jaeger-ui.config.json');
            return html;
          } catch (err) {
            console.error('[jaeger-ui-config] Error loading jaeger-ui.config.json:', err);
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
