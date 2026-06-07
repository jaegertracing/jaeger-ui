// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('./process-deprecation');

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
      window.getJaegerBackendCapabilities = undefined;
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

  describe('backendCapabilities', () => {
    beforeEach(() => {
      // Reset memoization before each test
      getConfig.apply({}, []);
    });

    it('uses backendCapabilities from getJaegerBackendCapabilities when injected', () => {
      // This is the normal production path: the backend (or Vite plugin in dev) injects
      // backendCapabilities via window.getJaegerBackendCapabilities, independently of
      // the main UI config.
      window.getJaegerUiConfig = jest.fn(() => ({}));
      window.getJaegerBackendCapabilities = jest.fn(() => ({
        archiveStorage: true,
        metricsStorage: true,
        aiAssistant: true,
      }));
      expect(getConfig().backendCapabilities).toEqual({
        archiveStorage: true,
        metricsStorage: true,
        aiAssistant: true,
      });
    });

    it('falls back to defaultConfig.backendCapabilities when getJaegerBackendCapabilities is not injected', () => {
      // When neither the backend nor the Vite plugin has injected the capabilities function,
      // the defaults are used.
      window.getJaegerUiConfig = jest.fn(() => ({}));
      window.getJaegerBackendCapabilities = undefined;
      expect(getConfig().backendCapabilities).toEqual(defaultConfig.backendCapabilities);
    });

    it('getJaegerBackendCapabilities takes precedence over backendCapabilities in the UI config', () => {
      // backendCapabilities in the main UI config object is always overridden by
      // getJaegerBackendCapabilities so the backend remains authoritative.
      window.getJaegerUiConfig = jest.fn(() => ({
        backendCapabilities: { archiveStorage: true, metricsStorage: true, aiAssistant: true },
      }));
      window.getJaegerBackendCapabilities = jest.fn(() => ({
        archiveStorage: false,
        metricsStorage: false,
        aiAssistant: false,
      }));
      expect(getConfig().backendCapabilities).toEqual({
        archiveStorage: false,
        metricsStorage: false,
        aiAssistant: false,
      });
    });

    it('folds legacy storageCapabilities from the UI config into backendCapabilities', () => {
      // Backwards compatibility: existing user configs that set `storageCapabilities`
      // should continue to work when the backend has not (yet) injected its own values.
      window.getJaegerUiConfig = jest.fn(() => ({
        storageCapabilities: { archiveStorage: true, metricsStorage: true },
      }));
      window.getJaegerBackendCapabilities = undefined;
      expect(getConfig().backendCapabilities).toEqual({
        archiveStorage: true,
        metricsStorage: true,
        aiAssistant: false,
      });
    });
  });

  describe('index functions are injected by backend', () => {
    let embedded;
    let capabilities;

    beforeEach(() => {
      getConfig.apply({}, []);
      embedded = {};
      window.getJaegerUiConfig = jest.fn(() => embedded);
      capabilities = defaultConfig.backendCapabilities;
      window.getJaegerBackendCapabilities = jest.fn(() => capabilities);
    });

    it('returns the default config when the embedded config is `null`', () => {
      embedded = null;
      expect(getConfig()).toEqual(defaultConfig);
    });

    it('merges the defaultConfig with the embedded config and backend capabilities', () => {
      embedded = { novel: 'prop' };
      capabilities = { archiveStorage: true, metricsStorage: false, aiAssistant: false };
      expect(getConfig()).toEqual({ ...defaultConfig, ...embedded, backendCapabilities: capabilities });
    });

    describe('overwriting precedence and merging', () => {
      describe('fields not in mergeFields', () => {
        it('gives precedence to the embedded config', () => {
          const mergeFieldsSet = new Set(mergeFields);
          const keys = Object.keys(defaultConfig).filter(
            k => !mergeFieldsSet.has(k) && k !== 'backendCapabilities'
          );
          embedded = {};
          keys.forEach(key => {
            embedded[key] = key;
          });
          expect(getConfig()).toEqual({ ...defaultConfig, ...embedded, backendCapabilities: capabilities });
        });
      });

      describe('fields in mergeFields', () => {
        it('gives precedence to non-objects in embedded', () => {
          embedded = {};
          mergeFields.forEach((k, i) => {
            embedded[k] = i ? true : null;
          });
          expect(getConfig()).toEqual({ ...defaultConfig, ...embedded, backendCapabilities: capabilities });
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
          expect(getConfig()).toEqual({ ...expected, backendCapabilities: capabilities });
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
