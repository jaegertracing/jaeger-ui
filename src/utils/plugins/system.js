// @flow

// Copyright (c) 2018 Uber Technologies, Inc.
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

import SystemJS from 'systemjs/dist/system.js';
import cssLoader from 'systemjs-plugin-css';

import exposedModules from './exposed-modules';
import prefixUrl from '../prefix-url';

function registerModule(name, value) {
  SystemJS.registerDynamic(name, [], true, (_require, _exports, _module) => {
    // eslint-disable-next-line no-param-reassign
    _module.exports = value;
  });
}

SystemJS.config({
  baseURL: prefixUrl('/static/plugins'),
  map: { css: 'systemjs-plugin-css' },
  meta: {
    '*': { esModule: true },
  },
});

// refer SystemJS to the CSS loader
registerModule('systemjs-plugin-css', cssLoader);

// modules exposed to the plugins
Object.keys(exposedModules).forEach(name => {
  registerModule(name, exposedModules[name]);
});

export default SystemJS;
