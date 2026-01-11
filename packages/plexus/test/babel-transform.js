// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const babelJest = require('babel-jest').default;

const babelConfiguration = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        modules: 'commonjs',
      },
    ],
    ['@babel/preset-react', { development: !process.env.CI, runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    'babel-plugin-inline-react-svg',
    ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }],
    '@babel/plugin-transform-private-methods',
  ],
};

const babelConfigurationForDepcheck = {
  presets: babelConfiguration.presets,
  plugins: babelConfiguration.plugins,
};

module.exports = babelJest.createTransformer(babelConfiguration);
module.exports.babelConfiguration = babelConfiguration;
module.exports.babelConfigurationForDepcheck = babelConfigurationForDepcheck;
