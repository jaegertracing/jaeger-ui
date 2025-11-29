// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

const proxyConfig = {
  target: 'http://localhost:16686',
  secure: false,
  changeOrigin: true,
  ws: true,
  xfwd: true,
};

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __REACT_APP_GA_DEBUG__: JSON.stringify(process.env.REACT_APP_GA_DEBUG || ''),
    __REACT_APP_VSN_STATE__: JSON.stringify(process.env.REACT_APP_VSN_STATE || ''),
    __APP_ENVIRONMENT__: JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  plugins: [
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
