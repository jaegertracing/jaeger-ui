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

import _get from 'lodash/get';
import _has from 'lodash/has';
import _set from 'lodash/set';
import _unset from 'lodash/unset';

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
    deprecations.forEach(deprecation => {
      const { formerKey, currentKey } = deprecation;
      if (_has(embedded, formerKey)) {
        let isTransfered = false;
        let isIgnored = false;
        if (!_has(embedded, currentKey)) {
          // the new key is not set so transfer the value at the old key
          const value = _get(embedded, formerKey);
          _set(embedded, currentKey, value);
          isTransfered = true;
        } else {
          isIgnored = true;
        }
        _unset(embedded, formerKey);
        if (!haveWarnedDeprecations) {
          // eslint-disable-next-line no-console
          console.warn(`"${formerKey}" is deprecated, instead use "${currentKey}"`);
          if (isTransfered) {
            // eslint-disable-next-line no-console
            console.warn(`The value at "${formerKey}" has been moved to "${currentKey}"`);
          }
          if (isIgnored) {
            // eslint-disable-next-line no-console
            console.warn(
              `The value at "${formerKey}" is being ignored in favor of the value at "${currentKey}"`
            );
          }
        }
      }
    });
    haveWarnedDeprecations = true;
  }
  return { ...defaultConfig, ...embedded };
}
