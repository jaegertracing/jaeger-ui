// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import getVersion from './get-version';
import defaultVersion from '../../constants/default-version';
import { getVersionInfo } from '../constants';
import { version as packageVersion } from '../../../package.json';

vi.mock('../constants', () => ({ getVersionInfo: vi.fn(() => '') }));

// The frontend half comes from the build-time inject, not from window.getJaegerVersion, so it is present
// whatever the backend embedded. With nothing injected the version falls back to package.json.
// What the backend half is when nothing was embedded: defaultVersion's empty fields, mapped.
const noBackend = {
  version: defaultVersion.gitVersion,
  commit: defaultVersion.gitCommit,
  buildDate: defaultVersion.buildDate,
};
const frontendDefault = { version: packageVersion, commit: '', modified: false };

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
      expect(getVersion()).toEqual({ backend: noBackend, frontend: frontendDefault });
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
      expect(getVersion()).toEqual({ backend: noBackend, frontend: frontendDefault });
    });

    it('returns the embedded version information when it is not `null`', () => {
      embedded = {
        gitVersion: 'v1.2.3',
        gitCommit: 'abcdef0',
        buildDate: '2026-08-10T00:00:00Z',
      };
      expect(getVersion().backend).toEqual({
        version: 'v1.2.3',
        commit: 'abcdef0',
        buildDate: '2026-08-10T00:00:00Z',
      });
    });
  });
});

describe('getVersion().frontend', () => {
  beforeEach(() => {
    window.getJaegerVersion = () => ({ gitCommit: 'abc', gitVersion: 'v1', buildDate: 'd' });
  });

  it('reports the commit the bundle was built from', () => {
    getVersionInfo.mockReturnValue(
      JSON.stringify({ version: packageVersion, objName: '567b6862', changed: { hasChanged: false } })
    );
    expect(getVersion().frontend).toMatchObject({ commit: '567b6862', modified: false });
  });

  it('reports a build from a dirty tree', () => {
    getVersionInfo.mockReturnValue(
      JSON.stringify({ objName: '567b6862', changed: { hasChanged: true, pretty: '1f +21' } })
    );
    expect(getVersion().frontend).toMatchObject({ commit: '567b6862', modified: true });
  });

  it('leaves the commit empty when nothing was injected', () => {
    getVersionInfo.mockReturnValue(undefined);
    expect(getVersion().frontend).toMatchObject({ commit: '', modified: false });
  });

  it('leaves the commit empty when the injected value is not JSON', () => {
    getVersionInfo.mockReturnValue('not json');
    expect(getVersion().frontend).toMatchObject({ commit: '' });
  });

  it('takes the version from the injected build info', () => {
    getVersionInfo.mockReturnValue(JSON.stringify({ version: '9.9.9', objName: 'abc1234' }));
    expect(getVersion().frontend.version).toBe('9.9.9');
  });

  it('falls back to the package version when the build injected none', () => {
    getVersionInfo.mockReturnValue(JSON.stringify({ objName: 'abc1234' }));
    expect(getVersion().frontend.version).toBe(packageVersion);
  });
});
