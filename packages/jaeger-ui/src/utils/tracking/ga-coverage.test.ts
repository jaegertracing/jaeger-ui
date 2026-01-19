// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Mock dependencies
jest.mock('../constants', () => ({
  getAppEnvironment: jest.fn(() => 'production'),
  shouldDebugGoogleAnalytics: jest.fn(() => true),
}));

jest.mock('../prefix-url', () => (s: string) => s);

declare global {
  interface Window {
    dataLayer: any[];
  }
}

describe('GA Coverage', () => {
  let originalFetch: typeof window.fetch;
  let mockFetch: jest.Mock;
  let GA: any;
  let trackNavigation: any;
  let captureException: any;

  beforeEach(() => {
    jest.resetModules();

    window.dataLayer = [];
    jest.clearAllMocks();
    originalFetch = window.fetch;
    mockFetch = jest.fn().mockResolvedValue({ status: 200, json: () => ({}) });
    window.fetch = mockFetch;

    // Require modules after reset
    GA = require('./ga').default;
    const ec = require('./error-capture');
    trackNavigation = ec.trackNavigation;
    captureException = ec.captureException;

    // Mock site-prefix via doMock since it might be cached?
    // jest.mock persists across resetModules if defined outside?
    // It's safer to rely on the top level mock or define it here if needed.
    jest.doMock('../../site-prefix', () => '/prefix/');
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  const config = {
    tracking: {
      gaID: 'UA-TEST',
      trackErrors: true,
      cookiesToDimensions: [
        { cookie: 'my-cookie', dimension: 'dim1' },
        { cookie: 'missing-cookie', dimension: 'dim2' },
      ] as any,
    },
  };

  it('initializes with cookies to dimensions', () => {
    document.cookie = 'my-cookie=foo';
    const ga = GA(config, 'v1', 'v1-long');
    ga.init();

    const setCmd = window.dataLayer.find((cmd: any) => cmd[0] === 'set' && cmd[1].dim1 === 'foo');
    expect(setCmd).toBeDefined();
  });

  it('formats various breadcrumbs and error info', async () => {
    const ga = GA(config, 'v1', 'v1-long');
    ga.init();

    // 1. Navigation crumbs
    trackNavigation('/dependencies'); // dp
    trackNavigation('/trace/123'); // tr
    trackNavigation('/search?x=y'); // sd
    trackNavigation('/search'); // sr
    trackNavigation('/'); // rt
    trackNavigation('/unknown'); // ??
    window.history.pushState({}, '', '/unknown');

    // 2. Fetch crumbs
    await window.fetch('/api/services'); // svc
    await window.fetch('/api/unknown/operations'); // op
    await window.fetch('/api/traces?service=x'); // sr
    await window.fetch('/api/traces/123'); // tr
    await window.fetch('/api/dependencies'); // dp
    await window.fetch('/foo.js'); // __IGNORE__

    // Add non-200 fetch
    mockFetch.mockResolvedValueOnce({ status: 500 });
    await window.fetch('/api/services'); // [svc|500]

    // 3. UI crumbs
    const div = document.createElement('div');
    div.className = 'ub-ignore MyClass';
    div.id = 'my-id';
    document.body.appendChild(div);
    for (let i = 0; i < 5; i++) {
      div.click();
    }

    // Fill breadcrumbs with errors to trigger truncation
    // 20 crumbs * 50 chars = 1000 chars > 498
    for (let i = 0; i < 25; i++) {
      try {
        throw new Error('long error message filling up the breadcrumbs buffer ' + i);
      } catch (e: any) {
        captureException(e);
      }
    }

    // 4. Trigger Final Error
    const error = new Error('Final Test Error');
    captureException(error);

    // Verify GA event exception (last one)
    // window.dataLayer has many events now. Find the last one matching final error.
    const exceptionEvents = window.dataLayer.filter((e: any) => e[0] === 'event' && e[1] === 'exception');
    const lastException = exceptionEvents[exceptionEvents.length - 1];
    expect(lastException).toBeDefined();
    expect(lastException[2].description).toContain('! Final Test Error');

    const eventCalls = window.dataLayer.filter(
      (e: any) => e[0] === 'event' && e[2].event_category === 'jaeger/??/error'
    );
    const lastEvent = eventCalls[eventCalls.length - 1];
    expect(lastEvent).toBeDefined();

    const eventLabel = lastEvent[2].event_label;
    // Expect truncation. Start crumbs (nav, fetch) might be pushed out by buffer logic (20 limit).
    // But we filled with 25 errors. So only errors remain.
    // So checking for [svc] is invalid now as it was shifted out.

    // Check that label IS truncated (length check? or content check?)
    // Max length 499.
    expect(eventLabel.length).toBeLessThanOrEqual(499);
    // It should contain the last error messages
    expect(eventLabel).toContain('filling up the breadcrumbs buffer');
    // It should NOT contain [svc] (shifted out)
    expect(eventLabel).not.toContain('[svc]');
  });

  it('handles stack trace missing', () => {
    const ga = GA(config, 'v1', 'v1-long');
    ga.init();

    class NoStackError extends Error {
      constructor(m: string) {
        super(m);
        this.stack = undefined;
      }
    }
    const error = new NoStackError('msg');
    captureException(error);

    const exceptionEvent = window.dataLayer.find((e: any) => e[0] === 'event' && e[1] === 'exception');
    expect(exceptionEvent).toBeDefined();
  });

  it('truncates very long messages/labels', () => {
    const ga = GA(config, 'v1', 'v1-long');
    ga.init();

    const longMsg = 'a'.repeat(1000);
    const error = new Error(longMsg);
    captureException(error);

    const exceptionEvent = window.dataLayer.find((e: any) => e[0] === 'event' && e[1] === 'exception');
    expect(exceptionEvent[2].description.length).toBeLessThan(150);
  });
});
