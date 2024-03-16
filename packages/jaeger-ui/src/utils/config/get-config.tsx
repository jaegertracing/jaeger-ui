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

import _get from 'lodash/get';
import memoizeOne from 'memoize-one';

import processDeprecation from './process-deprecation';
import defaultConfig, { deprecations, mergeFields } from '../../constants/default-config';

function getUiConfig() {
  const getter = window.getJaegerUiConfig;
  if (typeof getter !== 'function') {
    // eslint-disable-next-line no-console
    console.warn('Embedded config not available');
    return { ...defaultConfig };
  }
  return getter();
}

function getCapabilities() {
  const getter = window.getJaegerStorageCapabilities;
  const capabilities = typeof getter === 'function' ? getter() : null;
  return capabilities ?? defaultConfig.storageCapabilities;
}

/**
 * Merge the embedded config from the query service (if present) with the
 * default config from `../../constants/default-config`.
 */
const getConfig = memoizeOne(function getConfig() {
  const capabilities = getCapabilities();

  const embedded = getUiConfig();
  if (!embedded) {
    return { ...defaultConfig, storageCapabilities: capabilities };
  }
  // check for deprecated config values
  if (Array.isArray(deprecations)) {
    deprecations.forEach(deprecation => processDeprecation(embedded, deprecation, true));
  }
  const rv = { ...defaultConfig, ...embedded };
  // mergeFields config values should be merged instead of fully replaced
  mergeFields.forEach(key => {
    if (embedded && typeof embedded[key] === 'object' && embedded[key] !== null) {
      rv[key] = { ...defaultConfig[key], ...embedded[key] };
    }
  });
  return { ...rv, storageCapabilities: capabilities };
});

export default getConfig;

export function getConfigValue(path: string) {
  return _get(getConfig(), path);
}
