// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock('../site-prefix', () => `${global.location.origin}/a/site/prefix/`);

import prefixUrl, { getPathPrefix } from './prefix-url';

const PATH_PREFIX = '/a/site/prefix';

describe('prefixUrl()', () => {
  const tests = [
    { source: undefined, target: PATH_PREFIX },
    { source: null, target: PATH_PREFIX },
    { source: '', target: PATH_PREFIX },
    { source: '/', target: `${PATH_PREFIX}/` },
    { source: '/a', target: `${PATH_PREFIX}/a` },
    { source: '/a/', target: `${PATH_PREFIX}/a/` },
    { source: '/a/b', target: `${PATH_PREFIX}/a/b` },
  ];

  tests.forEach(({ source, target }) => {
    it(`prefixes "${source}" correctly`, () => {
      expect(prefixUrl(source)).toBe(target);
    });
  });
});

describe('getPathPrefix()', () => {
  const tests = [
    { address: '2a00:8a00:4000:751e::1c:8443' },
    { address: '[2a00:8a00:4000:751e::1c]:8443' },
    { address: '[2a00:8a00:4000:751e:0000:0000:0000:001c]:8443' },
    { address: '[::]:443' },
    { address: '127.0.0.1' },
    { address: '127.0.0.1:8443' },
    { address: 'jaeger.mydomain.com:8443' },
    { address: 'jaeger.mydomain.com' },
  ];

  tests.forEach(({ address }) => {
    it(`handles "${address}" correctly`, () => {
      const origin = `https://${address}`;
      const sitePrefix = `https://${address}/jaeger`;
      const target = '/jaeger';
      expect(getPathPrefix(origin, sitePrefix)).toBe(target);
    });
  });
});

describe('prefixUrl non-test environment', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('uses window.location in non-test environment', () => {
    jest.mock('./constants', () => ({
      getAppEnvironment: () => 'production',
    }));
    // We cannot easily mock site-prefix here because it runs on import.
    // However, jests module system allows us to isolate.

    // We need to define site-prefix mock to avoid error
    jest.mock('../site-prefix', () => 'http://example.com/prefix/');

    const { default: pUrl } = require('./prefix-url');
    // window.location is 'http://localhost' usually in JSDOM
    // Our logic uses window.location.origin
    // sitePrefix is http://example.com/prefix/
    // origin is http://localhost
    // regex replaces origin from sitePrefix?
    // wait, getPathPrefix(origin, sitePrefix)
    // If origin (localhost) is NOT in sitePrefix (example.com), regex ^origin doesn't match.
    // So pathPrefix = sitePrefix.

    expect(pUrl('/foo')).toBe('http://example.com/prefix/foo');
  });

  it('handles missing window gracefully', () => {
    jest.mock('./constants', () => ({
      getAppEnvironment: () => 'production',
    }));
    jest.mock('../site-prefix', () => '/prefix/');

    const originalWindow = global.window;
    delete global.window;

    const { default: pUrl } = require('./prefix-url');

    // origin should be ''
    // sitePrefix is '/prefix/'
    // getPathPrefix('', '/prefix/') -> '/prefix' (slash removed?)

    expect(pUrl('/bar')).toBe('/prefix/bar');

    global.window = originalWindow;
  });
});
