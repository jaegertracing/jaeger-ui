// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

// This file configures eslint for TypeScript, which will be used for this
// directory and all subdirectories.

module.exports = {
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        // placed after '@typescript-eslint/recommended' so TS formatting rules
        // that conflict with prettier rules are overriden
        'prettier',
      ],
      rules: {
        // use @typescript-eslint/no-useless-constructor to avoid null error on *.d.ts files
        'no-useless-constructor': 0,

        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/explicit-member-accessibility': 0,
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-useless-constructor': 1,
        '@typescript-eslint/prefer-interface': 0,

        // @typescript-eslint/eslint-plugin v2+ relaxations
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/ban-types': 0,
        '@typescript-eslint/no-empty-function': 0,
        '@typescript-eslint/no-inferrable-types': 0,
      },
    },
  ],
};
