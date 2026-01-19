// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as GA from './ga';
import { getAppEnvironment } from '../constants';

jest.mock('../constants');

let longStr = '---';

function getStr(len) {
  while (longStr.length < len) {
    longStr += longStr.slice(0, len - longStr.length);
  }
  return longStr.slice(0, len);
}

describe('google analytics tracking', () => {
  let tracking;

  beforeAll(() => {
    getAppEnvironment.mockReturnValue('test');
    tracking = GA.default(
      {
        tracking: {
          gaID: 'UA-123456',
          trackErrors: true,
          cookiesToDimensions: [{ cookie: 'page', dimension: 'dimension1' }],
        },
      },
      'c0mm1ts',
      'c0mm1tL'
    );
  });

  beforeEach(() => {
    jest.useFakeTimers();
    // Set an arbitrary date so that we can test the date-based dimension
    jest.setSystemTime(new Date('2023-01-01'));
    window.dataLayer = [];
  });

  describe('init', () => {
    it('check init function (no cookies)', () => {
      tracking.init();
      expect(window.dataLayer).toEqual([
        ['js', new Date()],
        ['config', 'UA-123456'],
        [
          'set',
          {
            appId: 'github.com/jaegertracing/jaeger-ui',
            appName: 'Jaeger UI',
            appVersion: 'c0mm1tL',
          },
        ],
      ]);
    });

    it('check init function (with cookies)', () => {
      document.cookie = 'page=1;';
      tracking.init();
      expect(window.dataLayer).toEqual([
        ['js', new Date()],
        ['config', 'UA-123456'],
        [
          'set',
          {
            appId: 'github.com/jaegertracing/jaeger-ui',
            appName: 'Jaeger UI',
            appVersion: 'c0mm1tL',
          },
        ],
        ['set', { dimension1: '1' }],
      ]);
    });
  });

  describe('trackPageView', () => {
    it('tracks a page view', () => {
      tracking.trackPageView('a', 'b');
      expect(window.dataLayer).toEqual([['event', 'page_view', { page_path: 'ab' }]]);
    });

    it('ignores search when it is falsy', () => {
      tracking.trackPageView('a');
      expect(window.dataLayer).toEqual([['event', 'page_view', { page_path: 'a' }]]);
    });
  });

  describe('trackError', () => {
    it('tracks an error', () => {
      tracking.trackError('a');
      expect(window.dataLayer).toEqual([
        ['event', 'exception', { description: expect.any(String), fatal: false }],
      ]);
    });

    it('ensures "jaeger" is prepended', () => {
      tracking.trackError('a');
      expect(window.dataLayer).toEqual([['event', 'exception', { description: 'jaeger/a', fatal: false }]]);
    });

    it('truncates if needed', () => {
      const str = `jaeger/${getStr(200)}`;
      tracking.trackError(str);
      expect(window.dataLayer).toEqual([
        ['event', 'exception', { description: str.slice(0, 149), fatal: false }],
      ]);
    });
  });

  describe('trackEvent', () => {
    it('tracks an event', () => {
      const category = 'jaeger/some-category';
      const action = 'some-action';
      tracking.trackEvent(category, action);
      expect(window.dataLayer).toEqual([
        [
          'event',
          'some-action',
          {
            event_category: category,
          },
        ],
      ]);
    });

    it('prepends "jaeger/" to the category, if needed', () => {
      const category = 'some-category';
      const action = 'some-action';
      tracking.trackEvent(category, action);
      expect(window.dataLayer).toEqual([['event', 'some-action', { event_category: `jaeger/${category}` }]]);
    });

    it('truncates values, if needed', () => {
      const str = `jaeger/${getStr(600)}`;
      tracking.trackEvent(str, str, str);
      expect(window.dataLayer).toEqual([
        [
          'event',
          str.slice(0, 499),
          {
            event_category: str.slice(0, 149),
            event_label: str.slice(0, 499),
          },
        ],
      ]);
    });
  });

  it('converting sentry errors', () => {
    window.onunhandledrejection({
      reason: new Error('abc'),
    });
    expect(window.dataLayer).toEqual([
      ['event', 'exception', { description: expect.any(String), fatal: false }],
      [
        'event',
        expect.any(String),
        {
          event_category: expect.any(String),
          event_label: expect.any(String),
          event_value: expect.any(Number),
        },
      ],
    ]);
  });

  it('sets event_value from number and value param', () => {
    tracking.trackEvent('jaeger/cat', 'act', 3.7);
    tracking.trackEvent('jaeger/cat', 'act', 'lbl', 9.2);
    expect(window.dataLayer[0][2].event_value).toBe(4);
    expect(window.dataLayer[1][2].event_value).toBe(9);
  });

  it('init() exits when isEnabled() is false', () => {
    getAppEnvironment.mockReturnValueOnce('production');
    const noGA = GA.default({ tracking: {} }, 'vS', 'vL');
    window.dataLayer = [];
    noGA.init();
    expect(window.dataLayer).toEqual([]); // no GA calls
  });

  describe('Debug mode', () => {
    let trackingDebug;
    let originalHref;

    beforeAll(() => {
      originalHref = window.location.href;
      // Keep same origin; only change the search to enable GA debug mode
      const path = window.location.pathname || '/';
      window.history.pushState({}, '', `${path}?ga-debug=true`);

      trackingDebug = GA.default(
        {
          tracking: {
            gaID: 'UA-123456',
            trackErrors: true,
            cookiesToDimensions: [{ cookie: 'page', dimension: 'dimension1' }],
          },
        },
        'c0mm1ts',
        'c0mm1tL'
      );
    });

    afterAll(() => {
      // Restore original URL for other tests
      window.history.pushState({}, '', originalHref);
    });

    it('isDebugMode = true', () => {
      console.log = jest.fn();

      trackingDebug.init();
      expect(console.log).toHaveBeenCalledTimes(4);

      trackingDebug.trackError();
      trackingDebug.trackEvent('jaeger/some-category', 'some-action');
      trackingDebug.trackPageView('a', 'b');
      expect(console.log).toHaveBeenCalledTimes(7);
    });
  });
});
