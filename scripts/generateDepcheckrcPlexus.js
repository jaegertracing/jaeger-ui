// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @vitest/coverage-v8 is only referenced via the --coverage CLI flag, not in source files.
const ignoredPackages = ['@vitest/coverage-v8'];

// Use the selected targetPackage for generating depcheckrcContent
const depcheckrcContent = {
  ignores: ignoredPackages,
};

// Use the argument provided to the script as the output file path
const outputFile = process.argv[2];

if (!outputFile) {
  process.exit(1);
}

const depcheckrcPath = path.resolve(__dirname, outputFile);

fs.writeFileSync(depcheckrcPath, JSON.stringify(depcheckrcContent, null, 2));
