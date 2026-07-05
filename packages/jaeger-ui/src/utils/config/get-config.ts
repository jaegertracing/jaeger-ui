// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';

import { BackendCapabilities, Config } from '../../types/config';
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

// getBackendCapabilities reads the capability blob injected by the
// query-service backend via window.getJaegerBackendCapabilities
// (search-replaced into index.html). index.html defines this function
// unconditionally, so a non-function value only appears in environments
// that don't load index.html (e.g. unit tests).
function getBackendCapabilities(): BackendCapabilities | null {
  const getter = window.getJaegerBackendCapabilities;
  return typeof getter === 'function' ? getter() : null;
}

/**
 * Merge the embedded config from the query service (if present) with the
 * default config from `../../constants/default-config`.
 *
 * The final config is assembled from three sources, in increasing priority:
 *   1. defaultConfig  — compile-time defaults
 *   2. getJaegerUiConfig()  — injected into index.html by query-service (or Vite plugin in dev)
 *   3. getJaegerBackendCapabilities()  — injected separately by query-service; always wins
 *      for backendCapabilities so the backend's authoritative knowledge of its own
 *      capabilities cannot be overridden by the UI config file.
 */
const getConfig = memoizeOne(function getConfig(): Config {
  const backendCapabilities = { ...defaultConfig.backendCapabilities, ...getBackendCapabilities() };
  const embedded = getUiConfig();

  if (!embedded) {
    return { ...defaultConfig, backendCapabilities };
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
  // backendCapabilities always comes from getJaegerBackendCapabilities(), overriding anything
  // that may be present in the UI config, so the backend remains authoritative.
  return { ...rv, backendCapabilities };
});

export default getConfig;
