// @flow

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

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Bluebird from 'bluebird';
import vm from 'vm';

import AssetsLoader from './AssetsLoader';
import { processLoadedPlugin } from './integrations';
import loadSources from './load-sources';
import MultiError from './MultiError';
import getConfig from '../config/get-config';
// import type { PluginsConfig } from '../../types/config';

export default function initPlugins() {
  const { options, sources } = getConfig().plugins;
  if (!options || !sources) {
    // to satisfy flow
    throw new Error('invalid state');
  }
  const assetsLoader = new AssetsLoader(options);
  // this._pluginsLoading = config.sources.map(sources => loadSources({ assetsLoader, sources }));
  const pluginsLoading = sources.map(pluginSources => loadSources({ assetsLoader, sources: pluginSources }));
  return Bluebird.all(
    pluginsLoading.map(pluginLoading => Bluebird.props(pluginLoading))
  ).then(pluginsLoaded => {
    const errors: Error[] = [];

    function processCssResult(cssResult) {
      if (cssResult.isRejected()) {
        const error = cssResult.reason();
        console.error(error);
        if (options.bail) {
          errors.push(error);
        }
      }
    }
    function processJsResult(jsResult) {
      if (jsResult.isRejected()) {
        const error = jsResult.reason();
        console.error(error);
        if (options.bail) {
          errors.push(error);
        }
      } else {
        const jsText = jsResult.value();
        // console.log('TODO: browserify vm thing', jsText.slice(0, 100));
        const context = { exports: {}, react: React, 'react-dom': ReactDOM };
        context.require = function require(external) {
          return context[external];
        };
        const res = vm.runInNewContext(jsText, context);
        console.log(res);
        processLoadedPlugin(res);
      }
    }

    for (let i = 0; i < pluginsLoaded.length; i++) {
      const { css, js } = pluginsLoaded[i];
      css.forEach(processCssResult);
      js.forEach(processJsResult);
    }
    if (errors.length) {
      return Bluebird.reject(new MultiError(errors));
    }
    return Bluebird.resolve(true);
  });
}
