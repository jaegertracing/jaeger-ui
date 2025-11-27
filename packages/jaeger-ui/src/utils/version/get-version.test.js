// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import getVersion from './get-version';
import defaultVersion from '../../constants/default-version';

describe('getVersion()', () => {
  const warnFn = jest.fn();
  let oldWarn;

  beforeAll(() => {
    oldWarn = console.warn;
    console.warn = warnFn;
  });

  beforeEach(() => {
    warnFn.mockClear();
  });

  afterAll(() => {
    console.warn = oldWarn;
  });

  describe('`window.getJaegerVersion` is not a function', () => {
    beforeAll(() => {
      window.getJaegerVersion = undefined;
    });

    it('warns once', () => {
      getVersion();
      expect(warnFn.mock.calls.length).toBe(1);
      getVersion();
      expect(warnFn.mock.calls.length).toBe(1);
    });

    it('returns the default version information', () => {
      expect(getVersion()).toEqual(defaultVersion);
    });
  });

  describe('`window.getJaegerVersion` is a function', () => {
    let embedded;
    let getJaegerVersion;

    beforeEach(() => {
      embedded = {};
      getJaegerVersion = jest.fn(() => embedded);
      window.getJaegerVersion = getJaegerVersion;
    });

    it('returns the default version information when the embedded version information is `null`', () => {
      embedded = null;
      expect(getVersion()).toEqual(defaultVersion);
    });

    it('returns the embedded version information when it is not `null`', () => {
      embedded = {
        a: '1',
        b: '2',
      };
      expect(getVersion()).toEqual(embedded);
    });
  });
});
