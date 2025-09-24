// Copyright (c) 2025 The Jaeger Authors.
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
        {
          development: env === 'development',
          useBuiltIns: true,
          runtime: 'automatic',
        },
      ],
      '@babel/preset-typescript',
    ],
    plugins: ['babel-plugin-inline-react-svg'],
    env: {
      production: {
        plugins: [
          [
            'babel-plugin-react-remove-properties',
            {
              properties: ['data-testid'],
            },
          ],
        ],
      },
    },
  };
}

module.exports = getBabelConfig;
