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

/* eslint-disable no-console, import/first */

jest.mock('./process-deprecation');
jest.mock('../../constants/default-ui-config', () => {
  const actual = require.requireActual('../../constants/default-ui-config');
  // define a deprecation
  const deprecations = [{ currentKey: 'current.key', formerKey: 'former.key' }];
  return { default: actual.default, deprecations };
});
jest.mock('../../constants/default-query-svc-config', () => {
  const actual = require.requireActual('../../constants/default-query-svc-config');
  // test sans deprecations
  const deprecations = [];
  return { default: actual.default, deprecations };
});

import { getUiConfig, getQuerySvcConfig } from './index';
import processDeprecation from './process-deprecation';
import defaultUiConfig, { deprecations as uiDeprecations } from '../../constants/default-ui-config';
import defaultQuerySvcConfig, {
  deprecations as querySvcDeprecations,
} from '../../constants/default-query-svc-config';

// functionality between UI config and query service config should be
// the same
const cases = [
  {
    fn: getUiConfig,
    fnName: 'getUiConfig()',
    factoryFnName: 'getJaegerUiConfig',
    defaultConfig: defaultUiConfig,
    defaultConfigName: 'defaultUiConfig',
    numDeprecations: uiDeprecations.length,
  },
  {
    fn: getQuerySvcConfig,
    fnName: 'getQuerySvcConfig()',
    factoryFnName: 'getJaegerQuerySvcConfig',
    defaultConfig: defaultQuerySvcConfig,
    defaultConfigName: 'defaultQuerySvcConfig',
    numDeprecations: querySvcDeprecations.length,
  },
];

cases.forEach(caseParams => {
  const { fn, fnName, factoryFnName, defaultConfig, defaultConfigName, numDeprecations } = caseParams;

  describe(fnName, () => {
    let oldWarn;
    let warnFn;

    beforeEach(() => {
      oldWarn = console.warn;
      warnFn = jest.fn();
      console.warn = warnFn;
    });

    afterEach(() => {
      console.warn = oldWarn;
    });

    describe(`window.${factoryFnName} is not a function`, () => {
      it('warns once', () => {
        fn();
        expect(warnFn.mock.calls.length).toBe(1);
        fn();
        expect(warnFn.mock.calls.length).toBe(1);
      });

      it('returns the default config', () => {
        expect(fn()).toEqual(defaultConfig);
      });
    });

    describe(`window.${factoryFnName} is a function`, () => {
      let embedded;
      let factoryFn;

      beforeEach(() => {
        embedded = {};
        factoryFn = jest.fn(() => embedded);
        window[factoryFnName] = factoryFn;
      });

      afterEach(() => {
        window[factoryFnName] = undefined;
      });

      it(`merges the ${defaultConfigName} with the embedded config`, () => {
        embedded = { novel: 'prop' };
        expect(fn()).toEqual({ ...defaultConfig, ...embedded });
      });

      it('gives precedence to the embedded config', () => {
        embedded = {};
        Object.keys(defaultConfig).forEach(key => {
          embedded[key] = key;
        });
        expect(fn()).toEqual(embedded);
      });

      it('processes deprecations every time `getUiConfig` is invoked', () => {
        processDeprecation.mockClear();
        fn();
        expect(processDeprecation.mock.calls.length).toBe(numDeprecations);
        fn();
        expect(processDeprecation.mock.calls.length).toBe(2 * numDeprecations);
      });
    });
  });
});
