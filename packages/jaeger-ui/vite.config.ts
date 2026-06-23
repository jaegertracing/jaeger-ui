// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      babel: { babelrc: true },
    }),
  ],
  define: {
    __REACT_APP_GA_DEBUG__: JSON.stringify(process.env.REACT_APP_GA_DEBUG ?? ''),
    __REACT_APP_VSN_STATE__: JSON.stringify(process.env.REACT_APP_VSN_STATE ?? ''),
    __APP_ENVIRONMENT__: JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  resolve: {
    alias: {
      // d3-flame-graph doesn't export its CSS in its package.json exports field.
      // With pnpm's hoisted node-linker, packages are installed at the workspace
      // root node_modules, so we resolve relative to the monorepo root.
      'd3-flame-graph/dist/d3-flamegraph.css': path.resolve(
        __dirname,
        '../../node_modules/d3-flame-graph/dist/d3-flamegraph.css'
      ),
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
