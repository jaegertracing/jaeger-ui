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

import type { PluginModule, PluginRoute } from '../../types/plugin-module';

type ValidityResult = {
  isValid: boolean,
  failureDescription?: string,
};

const PASS = Object.freeze({ isValid: true });

const URL_REGEX = /^https?:\/\/\w+\.\w+/i;

const VALID_FORMAT_VERSIONS = new Set(['0.0.0']);

function asString(value) {
  if (value == null) {
    return String(value);
  }
  let s;
  try {
    s = JSON.stringify(value);
  } catch (_) {
    s = String(value);
  }
  if (s.length > 256) {
    return `${s.slice(0, 253)}...`;
  }
  return s;
}

function fail(info: { name: string, detail?: string, value?: any }): ValidityResult {
  const { name, detail } = info;
  const parts = [`Plugin validation error, invalid ${name}`];
  if (detail) {
    parts.push(detail);
  }
  if ('value' in info) {
    parts.push(`found ${asString(info.value)}`);
  }
  const failureDescription = parts.join(', ');
  return { failureDescription, isValid: false };
}

function checkUrl(name, value) {
  if (!value || typeof value !== 'string' || !URL_REGEX.test(value)) {
    return fail({ name, value });
  }
  return PASS;
}

function checkString(name, value) {
  if (typeof value !== 'string' || !value) {
    return fail({ name, value, detail: 'expected a non-empty string' });
  }
  return PASS;
}

function checkFormatVersion(value) {
  if (!VALID_FORMAT_VERSIONS.has(value)) {
    return fail({ value, name: 'formatVersion' });
  }
  return PASS;
}

function checkArray(name: string, spec: { [string]: string }, items: any) {
  if (!Array.isArray(items) || !items.length) {
    return fail({ name, value: items, detail: 'expected a non-empty Array' });
  }
  const keys = Object.keys(spec);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      return fail({ name, detail: 'Array elements must be objects', value: item });
    }
    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[ki];
      const type = spec[key];
      const value = item[key];
      // eslint-disable-next-line valid-typeof
      if (typeof value !== type) {
        return fail({ name, value, detail: `Array element .${key} must be a ${type}` });
      }
    }
  }
  return PASS;
}

const checkMenuItems = checkArray.bind(null, 'menuItems Array', { text: 'string', to: 'string' });

function checkRoutes(routes: PluginRoute[]) {
  const cursory = checkArray('routes Array', { component: 'function', path: 'string' }, routes);
  if (!cursory.isValid) {
    return cursory;
  }
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const { connectToStore } = route;
    if (connectToStore == null) {
      continue;
    }
    if (typeof route.connectToStore !== 'object') {
      return fail({
        name: 'route',
        detail: `expected optional field .connectToStore to be an object`,
        value: route,
      });
    }
    const fields = connectToStore.stateFieldsToProps;
    const isOk =
      Array.isArray(fields) &&
      fields.length &&
      fields.every(field => typeof field === 'string' && field !== '');
    if (!isOk) {
      return fail({
        name: 'route',
        detail: 'expected .connectToStore.stateFieldsToProps to be an Array of strings',
        value: route,
      });
    }
  }
  return PASS;
}

// function checkReducers(reducers) {
//   const name = 'reducers';
//   if (!reducers || typeof reducers !== 'object') {
//     return fail({ name, detail: 'expected an object', value: reducers });
//   }
//   const keys = Object.keys(reducers);
//   if (!keys.length) {
//     return fail({ name, detail: 'expected at least one reducer', value: reducers });
//   }
//   for (let i = 0; i < keys.length; i++) {
//     const value = reducers[keys[i]];
//     if (typeof value !== 'function') {
//       return fail({ name, value, detail: 'each reducer must be a functions' });
//     }
//   }
//   return PASS;
// }

const metadataValidators = {
  formatVersion: checkFormatVersion,
  name: checkString.bind(null, 'name'),
  pluginVersion: checkString.bind(null, 'pluginVersion'),
  license: checkString.bind(null, 'license'),
  description: checkString.bind(null, 'description'),
  url: checkUrl.bind(null, 'url'),
};

const metadataProps = Object.keys(metadataValidators);

const integrationValidators = {
  init: init => (typeof init === 'function' ? PASS : fail({ name: 'init function', value: init })),
  menuItems: checkMenuItems,
  // reducers: checkReducers,
  routes: checkRoutes,
};

// const integrationProps = Object.keys(integrationValidators);

export default function validatePlugin(plugin: PluginModule) {
  for (let i = 0; i < metadataProps.length; i++) {
    const name = metadataProps[i];
    const result = metadataValidators[name](plugin[name]);
    if (!result.isValid) {
      return result;
    }
  }
  if (!plugin.init && !plugin.menuItems && !plugin.routes) {
    return fail({ name: 'plugin structure', detail: 'no integration points were defined' });
  }
  if (plugin.init) {
    const result = integrationValidators.init(plugin.init);
    if (!result.isValid) {
      return result;
    }
  }
  if (plugin.menuItems) {
    const result = integrationValidators.menuItems(plugin.menuItems);
    if (!result.isValid) {
      return result;
    }
  }
  if (plugin.routes) {
    const result = integrationValidators.routes(plugin.routes);
    if (!result.isValid) {
      return result;
    }
  }
  // for (let i = 0; i < integrationProps.length; i++) {
  //   const name = integrationProps[i];
  //   const value = plugin[name];
  //   if (!value) {
  //     continue;
  //   }
  //   const result = integrationValidators[name](value);
  //   if (!result.isValid) {
  //     return result;
  //   }
  // }
  return PASS;
}
