// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

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
 * Vite plugin that emits a bundle-stats.csv with per-module size estimates.
 *
 * Activated by: BUNDLE_STATS=1 npm run build
 *
 * In generateBundle, it records each module's renderedLength (post-tree-shake,
 * pre-minification) and which chunk it belongs to. In closeBundle, it reads the
 * actual minified chunk sizes from disk and distributes each chunk's size to its
 * modules proportionally. This gives a good approximation of each module's real
 * contribution to the final (minified, pre-gzip) bundle.
 *
 * Uses only the stable generateBundle/closeBundle plugin hooks, compatible with
 * both Vite 7 (Rollup) and Vite 8 (Rolldown).
 */
function bundleStatsPlugin(outDir: string) {
  // Accumulated per-module data: module path → { renderedLength, chunkFileName }
  const moduleData = new Map<string, { rendered: number; chunk: string }>();
  // Accumulated per-chunk pre-minification totals
  const chunkTotals = new Map<string, number>();

  return {
    name: 'bundle-stats-csv',
    generateBundle(
      _options: unknown,
      bundle: Record<
        string,
        { type: string; fileName: string; modules?: Record<string, { renderedLength: number }> }
      >
    ) {
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.modules) {
          let total = 0;
          for (const [mod, info] of Object.entries(chunk.modules)) {
            moduleData.set(mod, { rendered: info.renderedLength, chunk: chunk.fileName });
            total += info.renderedLength;
          }
          chunkTotals.set(chunk.fileName, (chunkTotals.get(chunk.fileName) ?? 0) + total);
        }
      }
    },
    closeBundle() {
      // Aggregate sizes by package name.
      const packageSizes = new Map<string, number>();
      for (const [rawMod, { rendered, chunk }] of moduleData) {
        const mod = rawMod.replace(/\0/g, '');
        const chunkTotal = chunkTotals.get(chunk);
        if (!chunkTotal) continue;
        const chunkPath = path.resolve(outDir, chunk);
        let minifiedSize: number;
        try {
          minifiedSize = fs.statSync(chunkPath).size;
        } catch {
          continue;
        }
        const estimated = Math.round((rendered / chunkTotal) * minifiedSize);
        // Extract package name from node_modules path (handles scoped packages).
        // Non-node_modules files are grouped under the source package name.
        const nmIdx = mod.lastIndexOf('node_modules/');
        let pkg: string;
        if (nmIdx !== -1) {
          const afterNm = mod.substring(nmIdx + 'node_modules/'.length);
          if (afterNm.startsWith('@')) {
            // Scoped package: @scope/name
            const parts = afterNm.split('/');
            pkg = `${parts[0]}/${parts[1]}`;
          } else {
            pkg = afterNm.split('/')[0];
          }
        } else {
          pkg = '<project>';
        }
        packageSizes.set(pkg, (packageSizes.get(pkg) ?? 0) + estimated);
      }
      const rows = [...packageSizes.entries()]
        .map(([pkg, size]) => ({ pkg, size }))
        .sort((a, b) => b.size - a.size);
      const lines = ['package,size', ...rows.map(r => `"${r.pkg}",${r.size}`)];
      const csvPath = path.resolve(outDir, 'bundle-stats.csv');
      fs.writeFileSync(csvPath, lines.join('\n'));
      console.log(`[bundle-stats] Wrote ${rows.length} packages to ${csvPath}`);
    },
  };
}

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

            // Inject the full UI config — mimics the Go server behavior for .json config files.
            html = html.replace(
              'const JAEGER_CONFIG = DEFAULT_CONFIG;',
              `const JAEGER_CONFIG = ${JSON.stringify(parsedConfig)};`
            );

            // Inject storageCapabilities if present in the config file.
            // The Go server injects this separately via its own search-replace on
            // JAEGER_STORAGE_CAPABILITIES; the Vite plugin must replicate that here so that
            // setting storageCapabilities in jaeger-ui.config.json works in dev mode too.
            if (parsedConfig.storageCapabilities) {
              html = html.replace(
                'const JAEGER_STORAGE_CAPABILITIES = DEFAULT_STORAGE_CAPABILITIES;',
                `const JAEGER_STORAGE_CAPABILITIES = { ...DEFAULT_STORAGE_CAPABILITIES, ...${JSON.stringify(parsedConfig.storageCapabilities)} };`
              );
            }

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
    process.env.BUNDLE_STATS && bundleStatsPlugin(path.resolve(__dirname, 'build')),
    jaegerUiConfigPlugin(),
    // Suppress LightningCSS warning about ::global() pseudo-element emitted by CSS modules.
    // This is a known issue: LightningCSS doesn't recognize the CSS modules :global() syntax.
    {
      name: 'suppress-lightningcss-global-warning',
      configResolved(config) {
        const originalWarn = config.logger.warn;
        config.logger.warn = (msg, ...args) => {
          if (typeof msg === 'string' && msg.includes("'global' is not recognized")) return;
          originalWarn.call(config.logger, msg, ...args);
        };
      },
    },
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
      // More-specific alias must come first; Vite matches the first prefix that applies.
      '@jaegertracing/plexus/demo': path.resolve(__dirname, '../plexus/demo/src/index'),
      '@jaegertracing/plexus': path.resolve(__dirname, '../plexus/src'),
    },
  },
});
