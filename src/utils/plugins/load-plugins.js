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

import _get from 'lodash/get';

import integrations, { integratePlugin } from './integrations';
import type { LoadedPlugin, PluginIntegrations } from './local-types';
import { addPluginModule } from './modules';
import SystemJS from './system';
import validatePlugin from './validate-plugin';
import getConfig from '../config/get-config';
import type { ConfigPluginItem } from '../../types/config';
import type { PluginModule } from '../../types/plugin-module';

type PluginPart = {
  type: string,
  value: string | PluginModule,
};

const pluginsCache: Map<ConfigPluginItem, Promise<LoadedPlugin>> = new Map();

function loadPlugin(config: ConfigPluginItem) {
  if (pluginsCache.has(config)) {
    return pluginsCache.get(config);
  }
  const { css = null, js = null } = config;
  if (!css && !js) {
    const error = new Error('Malformed plugin config, no JavaScript or CSS sources found');
    const p: Promise<LoadedPlugin> = Promise.reject(error);
    pluginsCache.set(config, p);
    return p;
  }
  const parts: Promise<PluginPart>[] = [];
  if (js) {
    const p: Promise<PluginModule> = SystemJS.import(js);
    // TODO(joe): handle validation results
    p.then(pl => console.log(validatePlugin(pl)));
    parts.push(p.then(pluginModule => ({ type: 'js', value: pluginModule })));
    p.then(integratePlugin);
  }
  if (css) {
    const p = SystemJS.import(`${css}!css`);
    parts.push(p.then(() => ({ type: 'css', value: 'OK' })));
  }
  const p: Promise<LoadedPlugin> = Promise.all(parts).then(modules => {
    const rv: LoadedPlugin = {};
    modules.forEach(pluginModule => {
      const { type, value } = pluginModule;
      rv[type] = value;
    });
    addPluginModule(config, rv);
    return rv;
  });
  pluginsCache.set(config, p);
  return p;
}

// eslint-disable-next-line import/prefer-default-export
export default function loadPlugins(): Promise<PluginIntegrations> {
  const pluginsConfig = getConfig().plugins;
  if (!Array.isArray(pluginsConfig)) {
    return Promise.resolve(integrations);
  }
  const p = Promise.all(pluginsConfig.map(loadPlugin));
  return p
    .then(pluginSources => {
      pluginSources.forEach(plugin => {
        const init = _get(plugin, 'js.init');
        if (typeof init === 'function') {
          init();
        }
      });
    })
    .then(() => integrations);
}
