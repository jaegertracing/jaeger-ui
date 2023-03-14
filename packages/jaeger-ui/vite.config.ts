// Copyright (c) 2023 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import vitePluginImp from 'vite-plugin-imp';
import visualizer from 'rollup-plugin-visualizer';

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
  // Workaround an imports issue with antd v3 that causes an error in the production build.
  // https://github.com/ant-design/ant-design/issues/19002
  resolve: {
    alias: {
      '@ant-design/icons/lib/dist': '@ant-design/icons/lib/index.es.js',
    },
  },
  plugins: [
    react(),
    legacy({
      targets: ['>0.5%', 'not dead', 'not ie <= 11', 'not op_mini all'],
    }),
    // Use vite-plugin-imp to automatically import corresponding styles
    // each time an AntD component is used.
    vitePluginImp({
      libList: [
        {
          libName: 'antd',
          style: name => `antd/es/${name}/style`,
        },
      ],
      // vite-plugin-imp by default tries to optimize all lodash imports as well,
      // but logs warnings in attempting to do so, so disable it.
      exclude: ['lodash'],
    }),
    // Generate a bundle size breakdown.
    visualizer(),
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        modifyVars: {
          // Supply appropriate overrides to the Ant Design System.
          '@primary-color': '#199',

          '@font-size-base': '14px',
          '@text-color-dark': '#e4e4e4',
          '@text-color-secondary-dark': '#fff',

          // Layout
          '@layout-body-background': '#fff',
          '@layout-header-background': '#404040',
          '@layout-footer-background': '@layout-body-background',
          '@layout-header-height': '46px',
          '@layout-header-padding': '0 50px',
          '@layout-footer-padding': '24px 50px',
          '@layout-sider-background': '@layout-header-background',
          '@layout-trigger-height': '48px',
          '@layout-trigger-background': 'tint(@heading-color, 20%)',
          '@layout-trigger-color': '#fff',
          '@layout-zero-trigger-width': '36px',
          '@layout-zero-trigger-height': '42px',

          '@menu-dark-bg': '#151515',

          // Table
          '@table-row-hover-bg': '#e5f2f2',
        },
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
});
