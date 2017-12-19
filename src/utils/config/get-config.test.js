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
jest.mock('../../constants/default-config', () => {
  const actual = require.requireActual('../../constants/default-config');
  // make sure there are deprecations
  const deprecations = [{ currentKey: 'current.key', formerKey: 'former.key' }];
  return { default: actual.default, deprecations };
});

import getConfig from './get-config';
import processDeprecation from './process-deprecation';
import defaultConfig from '../../constants/default-config';

describe('getConfig()', () => {
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

  describe('`window.getJaegerUiConfig` is not a function', () => {
    it('warns once', () => {
      getConfig();
      expect(warnFn.mock.calls.length).toBe(1);
      getConfig();
      expect(warnFn.mock.calls.length).toBe(1);
    });

    it('returns the default config', () => {
      expect(getConfig()).toEqual(defaultConfig);
    });
  });

  describe('`window.getJaegerUiConfig` is a function', () => {
    let embedded;
    let getJaegerUiConfig;

    beforeEach(() => {
      embedded = {};
      getJaegerUiConfig = jest.fn(() => embedded);
      window.getJaegerUiConfig = getJaegerUiConfig;
    });

    it('merges the defaultConfig with the embedded config ', () => {
      embedded = { novel: 'prop' };
      expect(getConfig()).toEqual({ ...defaultConfig, ...embedded });
    });

    it('gives precedence to the embedded config', () => {
      embedded = {};
      Object.keys(defaultConfig).forEach(key => {
        embedded[key] = key;
      });
      expect(getConfig()).toEqual(embedded);
    });

    it('processes deprecations every time `getConfig` is invoked', () => {
      processDeprecation.mockClear();
      getConfig();
      expect(processDeprecation.mock.calls.length).toBe(1);
      getConfig();
      expect(processDeprecation.mock.calls.length).toBe(2);
    });
  });
});
