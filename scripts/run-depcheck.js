#!/usr/bin/env node

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
