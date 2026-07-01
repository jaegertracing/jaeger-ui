#!/usr/bin/env node

// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Preinstall guard that enforces installs go through the pinned pnpm version.
 *
 * Replaces `npx only-allow pnpm`: that approach fetches a package from the
 * registry on every install, which fails (or stalls) offline/behind a proxy.
 * This script does the same check using only `npm_config_user_agent`, an
 * environment variable every npm-compatible package manager sets — no
 * network access or external dependencies required.
 */

const { packageManager } = require('../package.json');

// packageManager is of the form "pnpm@10.5.0"; pull out the pinned version.
const pinnedVersion = packageManager.split('@')[1];

const userAgent = process.env.npm_config_user_agent || '';

// userAgent looks like "pnpm/10.5.0 npm/? node/v24.18.0 linux x64".
const match = userAgent.match(/^(\w+)\/(\S+)/);
const [, name, version] = match || [];

if (name !== 'pnpm') {
  console.error(
    `\n⛔ This repository requires pnpm (detected: ${name || 'unknown'}).\n` +
      `   Run: corepack enable && pnpm install\n`
  );
  process.exit(1);
}

if (version !== pinnedVersion) {
  console.error(
    `\n⛔ This repository requires pnpm@${pinnedVersion} (detected: pnpm@${version}).\n` +
      `   Run: corepack prepare pnpm@${pinnedVersion} --activate\n`
  );
  process.exit(1);
}

process.exit(0);
