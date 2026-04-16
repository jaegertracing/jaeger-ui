// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [
    react({
      babel: { babelrc: true },
    }),
  ],
  define: {
    __REACT_APP_GA_DEBUG__: JSON.stringify(''),
    __REACT_APP_VSN_STATE__: JSON.stringify(''),
    __APP_ENVIRONMENT__: JSON.stringify('test'),
  },
  test: {
    pool: 'threads',
    environment: 'jsdom',
    globals: true,
    globalSetup: path.resolve(__dirname, 'test/vitest-global-setup.ts'),
    setupFiles: [path.resolve(__dirname, 'test/vitest-setup.ts')],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/setup*.js',
        'src/utils/DraggableManager/demo/**',
        'src/utils/test/**',
        'src/demo/**',
        'src/types/*',
      ],
    },
    snapshotFormat: {
      escapeString: true,
      printBasicPrototype: true,
    },
    silent: true,
    moduleNameMapper: {
      '\\.(css|less)$': 'identity-obj-proxy',
    },
  },
  server: {
    deps: {
      // cookie is CJS-only; its dist file has duplicate exports.X assignments
      // that break Node.js's static CJS named-export analysis when react-router's
      // ESM chunks do `import { parse, serialize } from 'cookie'`.
      // Inlining it through Vite's transform handles CJS→ESM conversion reliably.
      inline: ['cookie'],
    },
  },
  resolve: {
    alias: {
      // More-specific alias must come first
      '@jaegertracing/plexus/demo': path.resolve(__dirname, '../plexus/demo/src/index'),
      '@jaegertracing/plexus': path.resolve(__dirname, '../plexus/src'),
    },
  },
});
