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
        {
          development: !process.env.CI, // Development mode when not in CI (consistent with Jest config)
          useBuiltIns: true,
          runtime: 'automatic', // Modern JSX transform - no need to import React for JSX
        },
      ],
      '@babel/preset-typescript',
    ],
    plugins: [
      'babel-plugin-inline-react-svg', // Inline SVG files as React components
    ],
    env: {
      production: {
        plugins: [
          [
            'babel-plugin-react-remove-properties',
            { properties: ['data-testid'] }, // Remove test attributes from production builds
          ],
        ],
      },
    },
  };
}

module.exports = getBabelConfig;
