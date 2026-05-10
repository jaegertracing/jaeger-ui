// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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

// getCapabilities reads storage capabilities injected by the query-service backend
// via window.getJaegerStorageCapabilities (search-replaced into index.html).
// In development, the Vite plugin replicates this injection from jaeger-ui.config.json.
// Falls back to the default config when the function is not present.
function getCapabilities() {
  const getter = window.getJaegerStorageCapabilities;
  const capabilities = typeof getter === 'function' ? getter() : null;
  return capabilities ?? defaultConfig.storageCapabilities;
}

/**
 * Merge the embedded config from the query service (if present) with the
 * default config from `../../constants/default-config`.
 *
 * The final config is assembled from three sources, in increasing priority:
 *   1. defaultConfig  — compile-time defaults
 *   2. getJaegerUiConfig()  — injected into index.html by query-service (or Vite plugin in dev)
 *   3. getJaegerStorageCapabilities()  — injected separately by query-service; always wins for
 *      storageCapabilities so the backend's authoritative knowledge of its own capabilities
 *      cannot be overridden by the UI config file.
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
  // storageCapabilities always comes from getJaegerStorageCapabilities(), overriding anything
  // that may be present in the UI config, so the backend remains authoritative.
  return { ...rv, storageCapabilities: capabilities };
});

export default getConfig;
