// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const babelJest = require('babel-jest').default;

// Custom Babel plugin to transform import.meta for Jest compatibility.
// Transforms import.meta → process so that ESM-only files (e.g. Coordinator.ts
// which uses import.meta.url for Worker URL construction) work in Jest's
// CommonJS test environment without syntax errors.
const importMetaTransform = function () {
  return {
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWithSourceString('process');
        }
      },
    },
  };
};

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
    ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }],
    '@babel/plugin-transform-private-methods',
    importMetaTransform,
  ],
};

const sharedPluginsForDepcheck = [
  ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }],
  '@babel/plugin-transform-private-methods',
  // Note: custom function plugins are excluded for depcheck compatibility
];

const babelConfigurationForDepcheck = {
  presets: babelConfiguration.presets,
  plugins: sharedPluginsForDepcheck,
};

module.exports = babelJest.createTransformer(babelConfiguration);
module.exports.babelConfiguration = babelConfiguration;
module.exports.babelConfigurationForDepcheck = babelConfigurationForDepcheck;
