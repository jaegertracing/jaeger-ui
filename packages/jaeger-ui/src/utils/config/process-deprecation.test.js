// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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
});
