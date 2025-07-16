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

const babelJest = require('babel-jest').default;

// Custom Babel plugin to transform import.meta for Jest compatibility
// Problem: Redux-actions 3.x is ESM-only and uses import.meta.NODE_ENV internally.
// jest runs in CommonJS mode and cannot parse import.meta syntax, causing:
// SyntaxError: Cannot use 'import.meta' outside a module
// Solution: Transform import.meta to process during Jest transformation.
// This allows ESM-only packages to work in Jest's CommonJS test environment.
// Production code is unaffected, this only runs during testing.
const importMetaTransform = function() {
  return {
    visitor: {
      MetaProperty(path) {
        // Transform import.meta.NODE_ENV ==> process.NODE_ENV for Jest.
        // https://github.com/jaegertracing/jaeger-ui/pull/2980
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWithSourceString('process');
        }
      }
    }
  };
};

const babelConfiguration = {
  presets: [
    ['@babel/preset-env', {
      targets: { node: 'current' },
      modules: 'commonjs'
    }],
    ['@babel/preset-react', { development: !process.env.CI }],
    '@babel/preset-typescript',
  ],
  plugins: [
    'babel-plugin-inline-react-svg',
    ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }],
    importMetaTransform
  ],
}

// Export configuration for depcheck (without the function)
const babelConfigurationForDepcheck = {
  presets: babelConfiguration.presets,
  plugins: [
    'babel-plugin-inline-react-svg',
    ['@babel/plugin-transform-modules-commonjs', { allowTopLevelThis: true }],
    // Note: custom function plugins are excluded for depcheck compatibility
  ],
}

module.exports = babelJest.createTransformer(babelConfiguration);
module.exports.babelConfiguration = babelConfiguration;
module.exports.babelConfigurationForDepcheck = babelConfigurationForDepcheck;
