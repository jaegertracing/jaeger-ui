/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

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
    react(),
    legacy({
      targets: ['>0.5%', 'not dead', 'not ie <= 11', 'not op_mini all'],
    }),
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
          '@layout-header-height': '64px',
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
  },
});
