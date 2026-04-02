// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

describe('prefix-url coverage', () => {
  let originalLocation;

  beforeEach(() => {
    vi.resetModules();
    originalLocation = global.location;
  });

  afterEach(() => {
    global.location = originalLocation;
    vi.restoreAllMocks();
  });

  it('handles test environment without global.location', async () => {
    vi.doMock('./utils/constants', () => ({
      getAppEnvironment: () => 'test',
    }));
    vi.doMock('./site-prefix', () => ({ default: '/p/' }));

    // remove global.location
    delete global.location;

    // We expect origin to be ''
    // sitePrefix is '/p/'
    // getPathPrefix('', '/p/') -> '/p'

    const { default: pUrl } = await import('./utils/prefix-url');
    expect(pUrl('/x')).toBe('/p/x');
  });
});
