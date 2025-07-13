#!/usr/bin/env node

// Copyright (c) 2023 The Jaeger Authors
// Copyright (c) 2017 Uber Technologies, Inc.
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

// This script is run during the build and generates strings used to identify
// the application to Google Analytics tracking (or any tracking).
//
// See the comment on `getVersion(..)` function below for details.
// See also packages/jaeger-ui/src/utils/tracking/README.md

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'depcheckrc-'));
}

function runDepcheck(dir, configPath) {
  try {
    console.log(`Checking ${dir}`);
    const result = execSync(`node node_modules/depcheck/bin/depcheck.js "${dir}" --config "${configPath}"`, {
      encoding: 'utf8',
    });

    // Format output similar to the bash version
    const formattedOutput = result
      .split('\n')
      .map(line => line.replace(/^\*/, '⛔'))
      .map(line => (line ? `    ${line}` : line))
      .join('\n');

    console.log(formattedOutput);
    return false; // No issues found
  } catch (error) {
    // Format error output
    const formattedOutput = error.stdout
      .split('\n')
      .map(line => line.replace(/^\*/, '⛔'))
      .map(line => (line ? `    ${line}` : line))
      .join('\n');

    console.log(formattedOutput);
    return true; // Issues found
  }
}

function main() {
  const tempDir = createTempDir();
  let failed = false;

  try {
    // Check jaeger-ui
    const jaegerConfigPath = path.join(tempDir, 'DepcheckrcJaegerUI.json');
    execSync(`node scripts/generateDepcheckrcJaegerUI.js "${jaegerConfigPath}"`, { stdio: 'inherit' });

    if (runDepcheck('packages/jaeger-ui', jaegerConfigPath)) {
      failed = true;
    }

    // Check plexus
    const plexusConfigPath = path.join(tempDir, 'DepcheckrcPlexus.json');
    execSync(`node scripts/generateDepcheckrcPlexus.js "${plexusConfigPath}"`, { stdio: 'inherit' });

    if (runDepcheck('packages/plexus', plexusConfigPath)) {
      failed = true;
    }
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  if (failed) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
