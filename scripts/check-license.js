#!/usr/bin/env node

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
