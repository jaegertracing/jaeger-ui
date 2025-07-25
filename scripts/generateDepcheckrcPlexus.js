// Copyright (c) 2023 The Jaeger Authors.
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
