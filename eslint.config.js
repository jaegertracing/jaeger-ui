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

import js from '@eslint/js';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import jestPlugin from 'eslint-plugin-jest';

// Shared settings
const commonGlobals = {
  process: 'readonly',
  Buffer: 'readonly',
  global: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  require: 'readonly',
  module: 'readonly',
  exports: 'readonly',
  console: 'readonly',
  document: 'readonly',
  window: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  self: 'readonly',
  importScripts: 'readonly',
  postMessage: 'readonly',
  onmessage: 'readonly',
  addEventListener: 'readonly',
  removeEventListener: 'readonly',
  File: 'readonly',
  Blob: 'readonly',
  URL: 'readonly',
  Event: 'readonly',
  MouseEvent: 'readonly',
  performance: 'readonly',
  SVGElement: 'readonly',
  Element: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  HTMLCanvasElement: 'readonly',
  HTMLElement: 'readonly',
  HTMLDivElement: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',
  React: 'readonly',
  JSX: 'readonly',
  __APP_ENVIRONMENT__: 'readonly',
  __REACT_APP_VSN_STATE__: 'readonly',
  __REACT_APP_GA_DEBUG__: 'readonly',
  Window: 'readonly',
  CombokeysHandler: 'readonly',
};

const commonSettings = {
  'import/resolver': {
    node: {
      extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    },
  },
  react: {
    version: 'detect',
  },
};

const baseRules = {
  'prettier/prettier': ['error'],
  'no-unused-vars': 'off',
  'no-redeclare': 'off',
  'no-shadow': 'off',
  'no-use-before-define': 'off',
  'no-useless-constructor': 'off',
  'no-undef': 'off',
  'no-console': 'off',

  'react/jsx-uses-react': 'error',
  'react/jsx-uses-vars': 'error',
  'react/jsx-filename-extension': 'off',
  'react/prop-types': 'off',
  'react/sort-comp': [
    'error',
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

  'jsx-a11y/anchor-is-valid': 'off',
  'jsx-a11y/click-events-have-key-events': 'off',
  'jsx-a11y/href-no-hash': 'off',
  'jsx-a11y/interactive-supports-focus': 'off',
  'jsx-a11y/label-has-associated-control': 'off',
  'jsx-a11y/label-has-for': 'off',
  'jsx-a11y/mouse-events-have-key-events': 'off',
  'jsx-a11y/no-static-element-interactions': 'warn',

  'import/extensions': 'off',
  'import/no-extraneous-dependencies': 'off',

  'jest/no-disabled-tests': 'warn',
  'jest/no-focused-tests': 'error',
  'jest/no-identical-title': 'error',
};

const typescriptRules = {
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'interface',
      format: ['PascalCase'],
      prefix: ['I'],
    },
  ],
  '@typescript-eslint/no-this-alias': 'off',
  '@typescript-eslint/no-use-before-define': 'warn',
  '@typescript-eslint/no-redeclare': 'warn',
  '@typescript-eslint/no-shadow': 'warn',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': 'warn',
  '@typescript-eslint/no-require-imports': 'warn',
  '@typescript-eslint/no-empty-function': 'off',
  '@typescript-eslint/no-restricted-types': 'warn',
  '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always' }],
  '@typescript-eslint/no-unsafe-function-type': 'warn',
  '@typescript-eslint/no-wrapper-object-types': 'warn',
  '@typescript-eslint/ban-ts-comment': 'warn',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/explicit-member-accessibility': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/ban-types': 'off',
  '@typescript-eslint/no-inferrable-types': 'off',
  '@typescript-eslint/no-useless-constructor': 'warn',
  '@typescript-eslint/no-var-requires': 'off',
};

export default [
  js.configs.recommended,

  {
    ignores: [
      'packages/*/dist/**',
      'packages/*/lib/**',
      'packages/*/build/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/.DS_Store',
      '**/coverage/**',
      '**/tsconfig.tsbuildinfo',
      '**/index.tsbuildinfo',
      '**/index.d.ts',
      '**/layout.worker.bundled.js',
      '**/demo/**',
    ],
  },

  // TypeScript (.ts/.tsx)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        project: ['./packages/*/tsconfig.json'],
        tsconfigRootDir: '.',
      },
      globals: commonGlobals,
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      prettier: prettierPlugin,
      jest: jestPlugin,
    },
    settings: commonSettings,
    rules: {
      ...baseRules,
      ...typescriptRules,
    },
  },

  // JavaScript (.js/.jsx)
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: commonGlobals,
    },
    plugins: {
      react: reactPlugin,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      prettier: prettierPlugin,
      jest: jestPlugin,
    },
    settings: commonSettings,
    rules: {
      ...baseRules,
    },
  },
];
