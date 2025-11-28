// Copyright (c) 2023 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import getBabelConfig from '../packages/plexus/babel.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const babelConfiguration = getBabelConfig({
  env: () => {
    'development';
  },
});

const packageNames = [
  ...babelConfiguration.presets.flatMap(preset => {
    if (Array.isArray(preset)) {
      return [preset[0]];
    }
    return [preset];
  }),
  ...babelConfiguration.plugins.flatMap(plugin => {
    if (Array.isArray(plugin)) {
      return [plugin[0]];
    }
    return [plugin];
  }),
];

const otherPackages = ['rimraf', 'webpack-cli'];

// Use the selected targetPackage for generating depcheckrcContent
const depcheckrcContent = {
  ignores: [...packageNames, ...otherPackages],
};

// Use the argument provided to the script as the output file path
const outputFile = process.argv[2];

if (!outputFile) {
  process.exit(1);
}

const depcheckrcPath = path.resolve(__dirname, outputFile);

fs.writeFileSync(depcheckrcPath, JSON.stringify(depcheckrcContent, null, 2));
