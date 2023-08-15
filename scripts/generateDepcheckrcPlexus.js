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
const getBabelConfig = require('../packages/plexus/babel.config');

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

fs.writeFileSync('packages/plexus/.depcheckrc.json', JSON.stringify(depcheckrcContent, null, 2));
