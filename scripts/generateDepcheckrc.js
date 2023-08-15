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
const { babelConfiguration } = require('../packages/jaeger-ui/test/babel-transform');

// Extract package names from presets and plugins
const packageNames = [
  ...babelConfiguration.presets.flatMap(preset => {
    if (Array.isArray(preset)) {
      return [preset[0]];
    }
    return [preset];
  }),
  ...babelConfiguration.plugins,
];

const otherPackages = ['jest-environment-jsdom'];

// Generate the depcheckrc content
const depcheckrcContent = {
  ignores: [...packageNames, ...otherPackages],
  'ignore-dirs': ['build'],
};

// Path to depcheckrc.json file
const depcheckrcFilePath = 'packages/jaeger-ui/.depcheckrc.json';

// Generate .depcheckrc.json file
fs.writeFileSync(depcheckrcFilePath, JSON.stringify(depcheckrcContent, null, 2));
