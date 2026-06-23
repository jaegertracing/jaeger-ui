// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const { execSync } = require('child_process');
const pkg = require('../package.json');

const expected = pkg.packageManager?.match(/pnpm@(.+)/)?.[1];
if (!expected) {
  process.exit(0);
}

const actual = execSync('pnpm --version', { encoding: 'utf8' }).trim();
if (actual !== expected) {
  console.error(
    `\n❌ pnpm version mismatch: running ${actual}, expected ${expected}` +
      `\n   Run "corepack enable pnpm" to let corepack manage the pnpm version.\n`
  );
  process.exit(1);
}
