// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import js from '@eslint/js';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactXPlugin from 'eslint-plugin-react-x';
import importPlugin from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier';
import jestPlugin from 'eslint-plugin-jest';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  'import-x/resolver': {
    node: {
      extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    },
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

  'react-x/rules-of-hooks': 'error',
  'react-x/exhaustive-deps': 'error',

  'import-x/extensions': 'off',
  'import-x/no-extraneous-dependencies': 'off',

  'jest/no-disabled-tests': 'warn',
  'jest/no-focused-tests': 'error',
  'jest/no-identical-title': 'error',
};

const typescriptRules = {
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
      '**/demo/**',
      'packages/jaeger-ui/src/api/v3/generated-client.ts', // Auto-generated, will be used in Milestone 3.2
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
        project: ['./packages/*/tsconfig.json', './scripts/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      globals: commonGlobals,
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'react-x': reactXPlugin,
      'import-x': importPlugin,
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
      'react-x': reactXPlugin,
      'import-x': importPlugin,
      prettier: prettierPlugin,
      jest: jestPlugin,
    },
    settings: commonSettings,
    rules: {
      ...baseRules,
    },
  },
];
