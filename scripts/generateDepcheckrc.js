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

/* eslint-disable import/no-extraneous-dependencies */
const fs = require('fs');
const {
  babelConfiguration: babelConfigurationJaegerUI,
} = require('../packages/jaeger-ui/test/babel-transform');
const getBabelConfig = require('../packages/plexus/babel.config');
const babelConfigurationPlexus = getBabelConfig({
  env: () => {
    'development';
  },
});
const args = process.argv.slice(3);

let targetPackage;

// Check if the command line argument is provided and is valid
if (args.length > 0) {
  const providedPackage = args[0].toLowerCase();
  if (providedPackage === 'plexus' || providedPackage === 'jaeger-ui') {
    targetPackage = providedPackage;
  } else {
    console.error('Invalid package name. Please provide "plexus" or "jaeger-ui".');
    process.exit(1); // Exit the process with an error code
  }
} else {
  console.error('Please provide the --package flag with either "plexus" or "jaeger-ui".');
  process.exit(1);
}

// Extract package names from presets and plugins in jaeger-ui babel
const packageNamesJaegerUI = [
  ...babelConfigurationJaegerUI.presets.flatMap(preset => {
    if (Array.isArray(preset)) {
      return [preset[0]];
    }
    return [preset];
  }),
  ...babelConfigurationJaegerUI.plugins,
];

// Extract package names from presets and plugins in plexus babel
const packageNamesPlexus = [
  ...babelConfigurationPlexus.presets.flatMap(preset => {
    if (Array.isArray(preset)) {
      return [preset[0]];
    }
    return [preset];
  }),
  ...babelConfigurationPlexus.plugins.flatMap(plugin => {
    if (Array.isArray(plugin)) {
      return [plugin[0]];
    }
    return [plugin];
  }),
];

const otherPackagesJaegerUI = ['jest-environment-jsdom'];
const otherPackagesPlexus = ['rimraf', 'webpack-cli'];

// Use the selected targetPackage for generating depcheckrcContent
const depcheckrcContent = {
  ignores:
    targetPackage === 'plexus'
      ? [...packageNamesPlexus, ...otherPackagesPlexus]
      : [...packageNamesJaegerUI, ...otherPackagesJaegerUI],
  'ignore-dirs': ['build'],
};

const pathToJaegerUI = 'packages/jaeger-ui/.depcheckrc.json';
const pathToPlexus = 'packages/plexus/.depcheckrc.json';

if (targetPackage === 'plexus') {
  fs.writeFileSync(pathToPlexus, JSON.stringify(depcheckrcContent, null, 2));
} else {
  fs.writeFileSync(pathToJaegerUI, JSON.stringify(depcheckrcContent, null, 2));
}
