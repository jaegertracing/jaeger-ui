// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const babelJest = require('babel-jest').default;

// Custom Babel plugin to transform import.meta for Jest compatibility
// Problem: Redux-actions 3.x is ESM-only and uses import.meta.NODE_ENV internally.
// jest runs in CommonJS mode and cannot parse import.meta syntax, causing:
// SyntaxError: Cannot use 'import.meta' outside a module
// Solution: Transform import.meta to process during Jest transformation.
// This allows ESM-only packages to work in Jest's CommonJS test environment.
// Production code is unaffected, this only runs during testing.
const importMetaTransform = function () {
  return {
    visitor: {
      MetaProperty(path) {
        // Transform import.meta.NODE_ENV ==> process.NODE_ENV for Jest.
        // https://github.com/jaegertracing/jaeger-ui/pull/2980
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
    'babel-plugin-inline-react-svg',
    ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }],
    importMetaTransform,
  ],
};

// Export configuration for depcheck (without the function)
const babelConfigurationForDepcheck = {
  presets: babelConfiguration.presets,
  plugins: [
    'babel-plugin-inline-react-svg',
    ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }],
    // Note: custom function plugins are excluded for depcheck compatibility
  ],
};

module.exports = babelJest.createTransformer(babelConfiguration);
module.exports.babelConfiguration = babelConfiguration;
module.exports.babelConfigurationForDepcheck = babelConfigurationForDepcheck;
