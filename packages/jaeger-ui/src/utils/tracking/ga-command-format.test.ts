// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Config } from '../../types/config';
import GA from './ga';

vi.mock('../constants', () => ({
  getAppEnvironment: vi.fn(() => 'production'),
  shouldDebugGoogleAnalytics: vi.fn(() => false),
}));
vi.mock('../../site-prefix', () => ({ default: '/' }));

it('queues initialization and tracking commands in the format accepted by gtag.js', () => {
  const messages: unknown[] = [];
  Reflect.set(window, 'dataLayer', messages);
  const config = { tracking: { gaID: 'G-TEST', trackErrors: false } } as Config;
  const tracking = GA(config, 'short', 'long');

  tracking.init();
  tracking.trackPageView('/search', '?service=frontend');
  tracking.trackEvent('search', 'submit', 'Find traces', 2);
  tracking.trackError('boom');

  // Google dispatches gtag commands from Arguments objects; arrays are legacy method calls.
  const commands = messages
    .filter(message => Object.prototype.toString.call(message) === '[object Arguments]')
    .map(message => Array.from(message as IArguments));

  expect(commands).toEqual([
    ['js', expect.any(Date)],
    ['config', 'G-TEST'],
    ['set', { appId: 'github.com/jaegertracing/jaeger-ui', appName: 'Jaeger UI', appVersion: 'long' }],
    ['event', 'page_view', { page_path: '/search?service=frontend' }],
    ['event', 'submit', { event_category: 'jaeger/search', event_label: 'Find traces', event_value: 2 }],
    ['event', 'exception', { description: 'jaeger/boom', fatal: false }],
  ]);
});
