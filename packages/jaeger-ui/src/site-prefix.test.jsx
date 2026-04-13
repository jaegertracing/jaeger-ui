// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

describe('site-prefix', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function importSitePrefix() {
    const mod = await import('./site-prefix');
    return mod.default;
  }

  it('throws if no base element and not test', async () => {
    vi.doMock('./utils/constants', () => ({
      getAppEnvironment: () => 'production',
    }));
    vi.spyOn(document, 'querySelector').mockReturnValue(null);
    await expect(importSitePrefix()).rejects.toThrow('<base> element not found');
  });

  it('uses base href if present', async () => {
    vi.doMock('./utils/constants', () => ({
      getAppEnvironment: () => 'production',
    }));
    const href = 'http://example.com/base/';
    vi.spyOn(document, 'querySelector').mockReturnValue({ href });

    const prefix = await importSitePrefix();
    expect(prefix).toBe(href);
  });

  it('falls back to global.location if no base and test', async () => {
    vi.doMock('./utils/constants', () => ({
      getAppEnvironment: () => 'test',
    }));
    vi.spyOn(document, 'querySelector').mockReturnValue(null);
    // Global location is used in JSDOM
    const prefix = await importSitePrefix();
    expect(prefix).toBe(`${global.location.origin}/`);
  });

  it('sets webpack_public_path if window exists', async () => {
    vi.doMock('./utils/constants', () => ({
      getAppEnvironment: () => 'production',
    }));
    const href = 'http://base/';
    vi.spyOn(document, 'querySelector').mockReturnValue({ href });

    await importSitePrefix();
    expect(window.__webpack_public_path__).toBe(href);
  });
});
