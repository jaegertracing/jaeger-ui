// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

describe('prefix-url coverage', () => {
  let originalLocation;

  beforeEach(() => {
    jest.resetModules();
    originalLocation = global.location;
  });

  afterEach(() => {
    global.location = originalLocation;
  });

  it('handles test environment without global.location', () => {
    jest.mock('./utils/constants', () => ({
      getAppEnvironment: () => 'test',
    }));
    jest.mock('./site-prefix', () => '/p/');

    // remove global.location
    delete global.location;

    // We expect origin to be ''
    // sitePrefix is '/p/'
    // getPathPrefix('', '/p/') -> '/p'

    const { default: pUrl } = require('./utils/prefix-url');
    expect(pUrl('/x')).toBe('/p/x');
  });
});
