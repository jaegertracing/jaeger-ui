// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _get from 'lodash/get';
import memoizeOne from 'memoize-one';

import { Config } from '../../types/config';
import processDeprecation from './process-deprecation';
import defaultConfig, { deprecations, mergeFields } from '../../constants/default-config';

function getUiConfig() {
  const getter = window.getJaegerUiConfig;
  if (typeof getter !== 'function') {
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
const getConfig = memoizeOne(function getConfig(): Config {
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
