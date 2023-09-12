// Copyright (c) 2019 Uber Technologies, Inc.
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

module.exports = {
  root: true,
  env: {
    browser: true,
    jest: true,
    jasmine: true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', 'json', '.ts', '.tsx'],
      },
    },
  },
  extends: ['airbnb', 'prettier', 'eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./packages/*/tsconfig.json'],
        tsconfigRootDir: '.',
      },
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'interface',
            format: ['PascalCase'],
            prefix: ['I'],
          },
        ],

        // Disable ESLint core rules for which @typescript-eslint provides TypeScript-specific equivalents.
        '@typescript-eslint/no-this-alias': 0,
        'no-use-before-define': 0,
        '@typescript-eslint/no-use-before-define': 1,
        'no-redeclare': 0,
        '@typescript-eslint/no-redeclare': 1,
        'no-shadow': 0,
        '@typescript-eslint/no-shadow': 1,

        // Disable prop type checks for TSX components, as prop type validation is expected
        // to be handled by TypeScript there. Stray prop types in components converted from Flow
        // should eventually be removed.
        'react/require-default-props': 0,
        'react/default-props-match-prop-types': 0,
        'react/no-unused-prop-types': 0,
      },
    },
  ],
  rules: {
    /* general */
    'arrow-body-style': 0,
    'arrow-parens': [1, 'as-needed'],
    'class-methods-use-this': 0,
    'comma-dangle': 0,
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'no-continue': 0,
    'no-plusplus': 0,
    'no-self-compare': 0,
    'no-underscore-dangle': 0,
    'prefer-destructuring': 0,

    /* tsx */
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-var-requires': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',

    /* jsx */
    'jsx-a11y/anchor-is-valid': 0,
    'jsx-a11y/click-events-have-key-events': 0,
    'jsx-a11y/href-no-hash': 0,
    'jsx-a11y/interactive-supports-focus': 0,
    'jsx-a11y/label-has-associated-control': 0,
    'jsx-a11y/label-has-for': 0,
    'jsx-a11y/mouse-events-have-key-events': 0,
    'jsx-a11y/no-static-element-interactions': 1,

    /* react */
    'react/destructuring-assignment': 0,
    'react/jsx-curly-brace-presence': ['error', 'never'],
    'react/jsx-filename-extension': 0,
    'react/forbid-prop-types': 1,
    'react/function-component-definition': 0,
    'react/require-default-props': 1,
    'react/no-array-index-key': 1,
    'react/no-unused-class-component-methods': 0,
    'react/sort-comp': [
      2,
      {
        order: [
          'type-annotations',
          'defaultProps',
          'statics',
          'state',
          'propTypes',
          'static-methods',
          'instance-variables',
          'constructor',
          'lifecycle',
          'everything-else',
          '/^on.+$/',
          'render',
        ],
      },
    ],

    // eslint-config-airbnb v18+ relaxations
    'jsx-a11y/control-has-associated-label': 0,
    'react/jsx-props-no-spreading': 0,
    'react/state-in-constructor': 0,
    'react/static-property-placement': 0,
    'react/jsx-fragments': 0,
    'react/prop-types': 0,
    'max-classes-per-file': 0,
    'no-restricted-exports': [
      'error',
      {
        restrictedNamedExports: ['then'],
      },
    ],
    'prefer-arrow-callback': 0,
    'prefer-object-spread': 0,

    /* import */
    'import/prefer-default-export': 1,
    'import/no-named-default': 0,
    'import/extensions': 0,
  },
};
