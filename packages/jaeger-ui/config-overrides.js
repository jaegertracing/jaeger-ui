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

// Convert less vars to JS
const loadedVarOverrides = fs.readFileSync('config-overrides-antd-vars.less', 'utf8');
const modifyVars = lessToJs(loadedVarOverrides);

function webpack(_config, env) {
  let config = _config;
  config = rewireLess.withLoaderOptions({
    modifyVars,
    javascriptEnabled: true,
  })(config, env);
  config = injectBabelPlugin(
    ['import', { libraryName: 'antd', style: true, libraryDirectory: 'lib' }],
    config
  );
  return config;
}

// Don't use react-app-rewired/scripts/utils/babelTransform.js for the jest
// transform - it has an issue with automatically loading decorators.
function jest(config) {
  const _config = config;
  Object.keys(_config.transform).forEach(key => {
    if (_config.transform[key].endsWith('babelTransform.js')) {
      _config.transform[key] = require.resolve('./jest-babel-transform.js');
    }
  });
  return config;
}

module.exports = { jest, webpack };
