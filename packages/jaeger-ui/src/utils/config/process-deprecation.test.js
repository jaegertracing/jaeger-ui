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

describe('processDeprecation()', () => {
  const currentKey = 'current.key';
  const formerKey = 'former.key';
  const deprecation = { currentKey, formerKey };

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

  it('does nothing if `formerKey` is not set', () => {
    const config = {};
    processDeprecation(config, deprecation, true);
    expect(config).toEqual({});
    expect(warnFn.mock.calls.length).toBe(0);
  });
  describe('`formerKey` is set', () => {
    let value;
    let config;

    describe('`currentKey` is not set', () => {
      function generateConfig() {
        value = Math.random();
        config = {
          former: { key: value },
        };
      }

      beforeEach(() => {
        generateConfig();
        processDeprecation(config, deprecation, false);
      });

      it('moves the value to `currentKey`', () => {
        expect(config.current.key).toBe(value);
      });

      it('deletes `currentKey`', () => {
        expect(config.former.key).not.toBeDefined();
      });

      it('does not `console.warn()` when `issueWarning` is `false`', () => {
        expect(warnFn.mock.calls.length).toBe(0);
      });

      it('`console.warn()`s when `issueWarning` is `true`', () => {
        generateConfig();
        processDeprecation(config, deprecation, true);
        expect(warnFn.mock.calls.length).toBe(1);
        expect(warnFn.mock.calls[0].length).toBe(1);
        const msg = warnFn.mock.calls[0][0];
        expect(msg).toMatch(/is deprecated/);
        expect(msg).toMatch(/has been moved/);
      });
    });

    describe('`currentKey` is set', () => {
      function generateConfig() {
        value = Math.random();
        config = {
          former: { key: value * 2 },
          current: { key: value },
        };
      }

      beforeEach(() => {
        generateConfig();
        processDeprecation(config, deprecation, false);
      });

      it('leaves `currentKey` as-is', () => {
        expect(config.current.key).toBe(value);
      });

      it('deletes `former`', () => {
        expect(config.former.key).not.toBeDefined();
      });

      it('does not `console.warn()` when `issueWarning` is `false`', () => {
        expect(warnFn.mock.calls.length).toBe(0);
      });

      it('`console.warn()`s when `issueWarning` is `true`', () => {
        generateConfig();
        processDeprecation(config, deprecation, true);
        expect(warnFn.mock.calls.length).toBe(1);
        expect(warnFn.mock.calls[0].length).toBe(1);
        const msg = warnFn.mock.calls[0][0];
        expect(msg).toMatch(/is deprecated/);
        expect(msg).toMatch(/is being ignored/);
      });
    });
  });

  describe('robustness against malformed inputs and unsafe paths', () => {
    beforeEach(() => {
      warnFn.mockClear();
    });

    it('does nothing and warns when config is null', () => {
      processDeprecation(null, deprecation, true);
      expect(warnFn).toHaveBeenCalled();
      const msg = warnFn.mock.calls[0][0];
      expect(msg).toMatch(/Skipping deprecated config processing/);
    });

    it('does nothing and warns when keys are invalid', () => {
      const cfg = { former: { key: 1 } };
      processDeprecation(cfg, { formerKey: '', currentKey: '' }, true);
      expect(cfg.former.key).toBe(1);
      expect(warnFn).toHaveBeenCalled();
      const msg = warnFn.mock.calls[0][0];
      expect(msg).toMatch(/formerKey must be a non-empty string/);
      expect(msg).toMatch(/currentKey must be a non-empty string/);
    });

    it('skips dangerous path segments like __proto__ and warns', () => {
      const cfg = { former: { key: 1 } };
      processDeprecation(cfg, { formerKey: 'former.key', currentKey: '__proto__.polluted' }, true);
      // Value isn't moved and former remains since operation is skipped before action
      expect(cfg.former.key).toBe(1);
      expect(warnFn).toHaveBeenCalled();
      const msg = warnFn.mock.calls[0][0];
      expect(msg).toMatch(/contains a dangerous path segment/);
    });

    it('does not overwrite non-object intermediates when creating nested paths', () => {
      const cfg = { former: { key: 5 }, current: 'not-an-object' };
      processDeprecation(cfg, deprecation, true);
      // Should not mutate current nor delete former due to safety checks
      expect(cfg.current).toBe('not-an-object');
      expect(cfg.former.key).toBe(5);
      expect(warnFn).toHaveBeenCalled();
      const allMsgs = warnFn.mock.calls.map(c => c[0]).join('\n');
      expect(allMsgs).toMatch(/cannot safely create nested path/);
      expect(allMsgs).toMatch(/was left unchanged due to safety checks/);
    });
  });
});
