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

function findFiles(dir, extensions, exclude = []) {
  const files = [];

  function walkDir(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and other common directories
          if (!['node_modules', '.git', 'dist', 'lib', 'build'].includes(item)) {
            walkDir(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          const isValidExtension = extensions.some(
            validExt =>
              ext === validExt ||
              (validExt === '.tsx' && ext === '.ts') ||
              (validExt === '.jsx' && ext === '.js')
          );

          const isExcluded = exclude.some(excludePattern => item.includes(excludePattern));

          if (isValidExtension && !isExcluded) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore permission errors, etc.
    }
  }

  walkDir(dir);
  return files;
}

function checkLicenseHeader(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').slice(0, 6);
    const headerText = lines.join('\n').toLowerCase();

    return (
      headerText.includes('copyright') ||
      headerText.includes('generated') ||
      headerText.includes('licensed under')
    );
  } catch {
    return false;
  }
}

function main() {
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.css'];
  const exclude = ['layout.worker.bundled.js'];

  const directories = [
    'scripts',
    'packages/jaeger-ui/src',
    'packages/jaeger-ui/test',
    'packages/plexus/src',
    'packages/plexus/demo',
  ];

  const failedFiles = [];

  for (const dir of directories) {
    const fullDir = path.resolve(dir);
    if (fs.existsSync(fullDir)) {
      const files = findFiles(fullDir, extensions, exclude);

      for (const file of files) {
        if (!checkLicenseHeader(file)) {
          failedFiles.push(path.relative(process.cwd(), file));
        }
      }
    }
  }

  if (failedFiles.length > 0) {
    console.error('License header check failed:');
    failedFiles.forEach(file => console.error(`  ${file}`));
    process.exit(255);
  }

  console.log('License header check passed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
