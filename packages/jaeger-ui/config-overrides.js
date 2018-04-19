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

/* eslint-disable import/no-extraneous-dependencies */

const fs = require('fs');
const { injectBabelPlugin } = require('react-app-rewired');
const rewireLess = require('react-app-rewire-less');
const lessToJs = require('less-vars-to-js');

// Read the less file in as string
const loadedVarOverrides = fs.readFileSync('config-overrides-antd-vars.less', 'utf8');

// Pass in file contents
const modifyVars = lessToJs(loadedVarOverrides);

module.exports = function override(_config, env) {
  let config = _config;
  config = injectBabelPlugin(['import', { libraryName: 'antd', style: true }], config);
  config = rewireLess.withLoaderOptions({ modifyVars })(config, env);
  return config;
};
