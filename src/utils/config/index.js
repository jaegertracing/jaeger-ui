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
import defaultQuerySvcConfig, {
  deprecations as querySvcDeprecations,
} from '../../constants/default-query-svc-config';
import defaultUiConfig, { deprecations as uiDeprecations } from '../../constants/default-ui-config';

const CONFIG_NAME_UI = 'UI';
const CONFIG_NAME_QS = 'query-service';

const haveWarnedFactoryFn = {
  [CONFIG_NAME_UI]: false,
  [CONFIG_NAME_QS]: false,
};

const haveWarnedDeprecations = {
  [CONFIG_NAME_UI]: false,
  [CONFIG_NAME_QS]: false,
};

function getConfig(name, factoryFn, defaults, deprecations) {
  if (typeof factoryFn !== 'function') {
    if (!haveWarnedFactoryFn[name]) {
      // eslint-disable-next-line no-console
      console.warn(`Embedded ${name} config is not available`);
      haveWarnedFactoryFn[name] = true;
    }
    return { ...defaults };
  }
  const embedded = factoryFn();
  // check for (and move) deprecated config values
  if (embedded && Array.isArray(deprecations) && deprecations.length) {
    deprecations.forEach(deprecation =>
      processDeprecation(embedded, deprecation, !haveWarnedDeprecations[name])
    );
    haveWarnedDeprecations[name] = true;
  }
  return { ...defaults, ...embedded };
}

/**
 * Merge the embedded query-service config from the query service (if present)
 * with the default config from `../../constants/default-query-svc-config`.
 */
export function getQuerySvcConfig() {
  return getConfig(
    CONFIG_NAME_QS,
    window.getJaegerQuerySvcConfig,
    defaultQuerySvcConfig,
    querySvcDeprecations
  );
}

/**
 * Merge the embedded UI config from the query service (if present) with the
 * default config from `../../constants/default-ui-config`.
 */
export function getUiConfig() {
  return getConfig(CONFIG_NAME_UI, window.getJaegerUiConfig, defaultUiConfig, uiDeprecations);
}
