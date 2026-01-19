// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

describe('site-prefix', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function requireSitePrefix() {
    return require('./site-prefix').default;
  }

  it('throws if no base element and not test', () => {
    jest.doMock('./utils/constants', () => ({
      getAppEnvironment: () => 'production',
    }));
    jest.spyOn(document, 'querySelector').mockReturnValue(null);
    expect(() => requireSitePrefix()).toThrow('<base> element not found');
  });

  it('uses base href if present', () => {
    jest.doMock('./utils/constants', () => ({
      getAppEnvironment: () => 'production',
    }));
    const href = 'http://example.com/base/';
    jest.spyOn(document, 'querySelector').mockReturnValue({ href });

    const prefix = requireSitePrefix();
    expect(prefix).toBe(href);
  });

  it('falls back to global.location if no base and test', () => {
    jest.doMock('./utils/constants', () => ({
      getAppEnvironment: () => 'test',
    }));
    jest.spyOn(document, 'querySelector').mockReturnValue(null);
    // Global location is used in JSDOM
    expect(requireSitePrefix()).toBe(`${global.location.origin}/`);
  });

  it('sets webpack_public_path if window exists', () => {
    jest.doMock('./utils/constants', () => ({
      getAppEnvironment: () => 'production',
    }));
    const href = 'http://base/';
    jest.spyOn(document, 'querySelector').mockReturnValue({ href });

    requireSitePrefix();
    expect(window.__webpack_public_path__).toBe(href);
  });
});
