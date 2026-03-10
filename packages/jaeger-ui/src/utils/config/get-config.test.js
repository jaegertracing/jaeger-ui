// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock('./process-deprecation');

import getConfig from './get-config';
import processDeprecation from './process-deprecation';
import defaultConfig, { deprecations, mergeFields } from '../../constants/default-config';

describe('getConfig()', () => {
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

  describe('index functions are not yet injected by backend', () => {
    beforeAll(() => {
      window.getJaegerUiConfig = undefined;
      window.getJaegerStorageCapabilities = undefined;
    });

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

  describe('storageCapabilities', () => {
    beforeEach(() => {
      // Reset memoization before each test
      getConfig.apply({}, []);
    });

    it('uses storageCapabilities from getJaegerStorageCapabilities when injected', () => {
      // This is the normal production path: the backend (or Vite plugin in dev) injects
      // storageCapabilities via window.getJaegerStorageCapabilities, independently of
      // the main UI config.
      window.getJaegerUiConfig = jest.fn(() => ({}));
      window.getJaegerStorageCapabilities = jest.fn(() => ({
        archiveStorage: true,
        metricsStorage: true,
      }));
      expect(getConfig().storageCapabilities).toEqual({ archiveStorage: true, metricsStorage: true });
    });

    it('falls back to defaultConfig.storageCapabilities when getJaegerStorageCapabilities is not injected', () => {
      // When neither the backend nor the Vite plugin has injected the capabilities function,
      // the default (metricsStorage: false) is used.
      window.getJaegerUiConfig = jest.fn(() => ({}));
      window.getJaegerStorageCapabilities = undefined;
      expect(getConfig().storageCapabilities).toEqual(defaultConfig.storageCapabilities);
    });

    it('getJaegerStorageCapabilities takes precedence over storageCapabilities in the UI config', () => {
      // storageCapabilities in the main UI config object is always overridden by
      // getJaegerStorageCapabilities so the backend remains authoritative.
      window.getJaegerUiConfig = jest.fn(() => ({
        storageCapabilities: { archiveStorage: true, metricsStorage: true },
      }));
      window.getJaegerStorageCapabilities = jest.fn(() => ({
        archiveStorage: false,
        metricsStorage: false,
      }));
      expect(getConfig().storageCapabilities).toEqual({ archiveStorage: false, metricsStorage: false });
    });
  });

  describe('index functions are injected by backend', () => {
    let embedded;
    let capabilities;

    beforeEach(() => {
      getConfig.apply({}, []);
      embedded = {};
      window.getJaegerUiConfig = jest.fn(() => embedded);
      capabilities = defaultConfig.storageCapabilities;
      window.getJaegerStorageCapabilities = jest.fn(() => capabilities);
    });

    it('returns the default config when the embedded config is `null`', () => {
      embedded = null;
      expect(getConfig()).toEqual(defaultConfig);
    });

    it('merges the defaultConfig with the embedded config and storage capabilities', () => {
      embedded = { novel: 'prop' };
      capabilities = { archiveStorage: true, metricsStorage: false };
      expect(getConfig()).toEqual({ ...defaultConfig, ...embedded, storageCapabilities: capabilities });
    });

    describe('overwriting precedence and merging', () => {
      describe('fields not in mergeFields', () => {
        it('gives precedence to the embedded config', () => {
          const mergeFieldsSet = new Set(mergeFields);
          const keys = Object.keys(defaultConfig).filter(k => !mergeFieldsSet.has(k));
          embedded = {};
          keys.forEach(key => {
            embedded[key] = key;
          });
          expect(getConfig()).toEqual({ ...defaultConfig, ...embedded, storageCapabilities: capabilities });
        });
      });

      describe('fields in mergeFields', () => {
        it('gives precedence to non-objects in embedded', () => {
          embedded = {};
          mergeFields.forEach((k, i) => {
            embedded[k] = i ? true : null;
          });
          expect(getConfig()).toEqual({ ...defaultConfig, ...embedded, storageCapabilities: capabilities });
        });

        it('merges object values', () => {
          embedded = {};
          const key = mergeFields[0];
          if (!key) {
            throw new Error('invalid mergeFields');
          }
          embedded[key] = { a: true, b: false };
          const expected = { ...defaultConfig, ...embedded };
          expected[key] = { ...defaultConfig[key], ...embedded[key] };
          expect(getConfig()).toEqual({ ...expected, storageCapabilities: capabilities });
        });
      });
    });

    it('processes deprecations in `getConfig` is invoked only once', () => {
      processDeprecation.mockClear();
      getConfig();
      expect(processDeprecation.mock.calls.length).toBe(deprecations.length);
      getConfig();
      expect(processDeprecation.mock.calls.length).toBe(deprecations.length);
    });
  });
});
