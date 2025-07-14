// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as GA from './ga';
import { getAppEnvironment } from '../constants';

jest.mock('./conv-sentry-to-ga', () => () => ({
  category: 'jaeger/a',
  action: 'some-action',
  message: 'jaeger/a',
}));

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
      ['event', expect.any(String), { event_category: expect.any(String) }],
    ]);
  });

  describe('Debug mode', () => {
    let trackingDebug;

    beforeAll(() => {
      const originalWindow = { ...window };
      const windowSpy = jest.spyOn(global, 'window', 'get');
      windowSpy.mockImplementation(() => ({
        ...originalWindow,
        location: {
          ...originalWindow.location,
          href: 'http://my.test/page',
          search: 'ga-debug=true',
        },
      }));

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
