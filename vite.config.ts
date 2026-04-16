// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    arrowParens: 'avoid',
    printWidth: 110,
    proseWrap: 'never',
    singleQuote: true,
    trailingComma: 'es5',
    sortPackageJson: false,
    ignorePatterns: [
      'packages/*/lib/',
      'packages/*/dist/',
      'packages/*/build/',
      'packages/jaeger-ui/index.d.ts',
      'scripts/release-notes.py',
      'scripts/draft-release.py',
      'docs/',
      'CHANGELOG.md',
      'RELEASE.md',
    ],
  },
});
