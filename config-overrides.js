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

const systemJsRegex = /node_modules\/systemjs(\/|-)/;

// SystemJS workes with `module`, `exports`, `defines`, `require`, `import`
// and does not play well with webpack, so it should not be parsed by webpack.
// Further, SystemJS has no dependencies, so it's ok for webpack to include
// SystemJS without parsing it for dependencies.
function addNoParse(config) {
  const m = config.module;
  const noParse = m.noParse;
  if (!noParse) {
    m.noParse = systemJsRegex;
    return config;
  }
  if (Array.isArray(noParse)) {
    m.noParse = noParse.concat(systemJsRegex);
    return config;
  }
  if (typeof noParse === 'function') {
    m.noParse = value => noParse(value) || systemJsRegex.test(value);
    return config;
  }
  if (noParse instanceof RegExp) {
    m.noParse = [noParse, systemJsRegex];
    return config;
  }
  throw new Error(`unrecognized value for module.noParse: ${noParse}`);
}

module.exports = function override(_config, env) {
  let config = _config;
  config = addNoParse(config);
  config = injectBabelPlugin(['import', { libraryName: 'antd', style: true }], config);
  config = rewireLess.withLoaderOptions({ modifyVars })(config, env);
  return config;
};
