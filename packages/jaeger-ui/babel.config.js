// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

function getBabelConfig(api) {
  const env = api.env();
  return {
    presets: [
      [
        '@babel/preset-env',
        {
          // Don't transform ES modules
          modules: false,
          targets: ['>0.5%', 'not dead', 'not ie <= 11', 'not op_mini all'],
        },
      ],
      [
        '@babel/preset-react',
        { development: env === 'development', useBuiltIns: true, runtime: 'automatic' },
      ],
      '@babel/preset-typescript',
    ],
    plugins: ['babel-plugin-inline-react-svg'],
    env: {
      production: {
        plugins: [['babel-plugin-react-remove-properties', { properties: ['data-testid'] }]],
      },
    },
  };
}

module.exports = getBabelConfig;
