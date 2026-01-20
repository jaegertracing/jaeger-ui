// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

function getBabelConfig(api) {
  const env = api.env();
  return {
    assumptions: {
      setPublicClassFields: true,
    },
    plugins: [
      '@babel/plugin-syntax-dynamic-import',
      [
        'babel-plugin-transform-react-remove-prop-types',
        {
          removeImport: true,
        },
      ],
      '@babel/plugin-transform-class-properties',
    ],
    presets: [
      [
        '@babel/preset-env',
        {
          // Don't transform ES modules
          modules: false,
          // this should match the settings in jaeger-ui/package.json
          targets: ['>0.5%', 'not dead', 'not ie <= 11', 'not op_mini all'],
        },
      ],
      [
        '@babel/preset-react',
        {
          development: env === 'development',
          useBuiltIns: true,
          runtime: 'automatic',
        },
      ],
      '@babel/preset-typescript',
    ],
  };
}

module.exports = getBabelConfig;
