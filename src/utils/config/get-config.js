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

import processDeprecation from './process-deprecation';
import defaultConfig, { deprecations } from '../../constants/default-config';

let haveWarnedFactoryFn = false;
let haveWarnedDeprecations = false;

/**
 * Merge the embedded config from the query service (if present) with the
 * default config from `../../constants/default-config`.
 */
export default function getConfig() {
  const getJaegerUiConfig = window.getJaegerUiConfig;
  if (typeof getJaegerUiConfig !== 'function') {
    if (!haveWarnedFactoryFn) {
      // eslint-disable-next-line no-console
      console.warn('Embedded config not available');
      haveWarnedFactoryFn = true;
    }
    return { ...defaultConfig };
  }
  const embedded = getJaegerUiConfig();
  // check for deprecated config values
  if (embedded && Array.isArray(deprecations)) {
    deprecations.forEach(deprecation => processDeprecation(embedded, deprecation, !haveWarnedDeprecations));
    haveWarnedDeprecations = true;
  }
  return { ...defaultConfig, ...embedded };
}
