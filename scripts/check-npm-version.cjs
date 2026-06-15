// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const { execSync } = require('child_process');
const pkg = require('../package.json');

const expected = pkg.packageManager?.match(/npm@(.+)/)?.[1];
if (!expected) {
  process.exit(0);
}

const actual = execSync('npm --version', { encoding: 'utf8' }).trim();
if (actual !== expected) {
  console.error(
    `\n❌ npm version mismatch: running ${actual}, expected ${expected}` +
      `\n   Run "corepack enable npm" to let corepack manage the npm version.\n`
  );
  process.exit(1);
}
