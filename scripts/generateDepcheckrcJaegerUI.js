// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { babelConfigurationForDepcheck } from '../packages/jaeger-ui/test/babel-transform.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageNames = [
  ...babelConfigurationForDepcheck.presets.flatMap(preset => {
    if (Array.isArray(preset)) {
      return [preset[0]];
    }
    return [preset];
  }),
  ...babelConfigurationForDepcheck.plugins.flatMap(plugin => {
    if (Array.isArray(plugin)) {
      return [plugin[0]];
    }
    return [plugin];
  }),
];

const otherPackages = ['jest-environment-jsdom', '@types/jest'];

// Use the selected targetPackage for generating depcheckrcContent
const depcheckrcContent = {
  ignores: [...packageNames, ...otherPackages],
  'ignore-dirs': ['build'],
};

// Use the argument provided to the script as the output file path
const outputFile = process.argv[2];

if (!outputFile) {
  process.exit(1);
}

const depcheckrcPath = path.resolve(__dirname, outputFile);

fs.writeFileSync(depcheckrcPath, JSON.stringify(depcheckrcContent, null, 2));
