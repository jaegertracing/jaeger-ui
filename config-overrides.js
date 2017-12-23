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

// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require('webpack');

module.exports = function override(config, env) {
  if (env === 'production') {
    config.plugins.push(
      // prevent code-splitting to allow the URL path-prefix for the site to be
      // configurable at runtime
      // https://github.com/jaegertracing/jaeger-ui/issues/42
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      })
    );
  }
  return config;
};
