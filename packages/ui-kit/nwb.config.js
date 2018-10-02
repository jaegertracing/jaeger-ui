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

// make sure the worker files are run through the babel-loader before the worker-loader
function setBabelPre(config) {
  const babel = config.module.rules.find(rule => /babel-loader/.test(rule.loader));
  babel.enforce = 'pre';
  return config;
}

module.exports = function nwbConfig() {
  return {
    type: 'react-component',
    npm: {
      esModules: true,
      cjs: true,
      umd: {
        global: 'JaegerUiKit',
        externals: {
          react: 'React',
          'react-dom': 'ReactDom',
        },
      },
    },
    babel: {
      config(cfg) {
        // eslint-disable-next-line no-param-reassign
        cfg.compact = true;
        return cfg;
      },
    },
    devServer: { hot: false },
    webpack: {
      config: setBabelPre
    }
  }
};
