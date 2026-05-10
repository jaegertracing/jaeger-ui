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
      // Inline all node_modules through Vite's transform pipeline.
      // The threads pool uses SSR resolve conditions that prefer .mjs files,
      // causing CJS/ESM named-export interop failures for packages like
      // react-router and cookie. inline:true fixes this class of problem
      // universally rather than playing whack-a-mole with individual packages.
      inline: true,
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
