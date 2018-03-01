// @flow

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

import _get from 'lodash/get';
import queryString from 'query-string';
import ReactGA from 'react-ga';
import Raven from 'raven-js';

import convRavenToGa from './conv-raven-to-ga';
import getConfig from '../config/get-config';

type EventData = {
  category: string,
  action?: string,
  label?: string,
  value?: number,
};

const EVENT_LENGTHS = {
  action: 499,
  category: 149,
  label: 499,
};

// Util so "0" and "false" become false
const isTruish = value => Boolean(value) && value !== '0' && value !== 'false';

const isProd = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// In test mode if development and envvar REACT_APP_GA_DEBUG is true-ish
const isDebugMode =
  (isDev && isTruish(process.env.REACT_APP_GA_DEBUG)) ||
  isTruish(queryString.parse(_get(window, 'location.search'))['ga-debug']);

const config = getConfig();
// enable for tests, debug or if in prod with a GA ID
export const isGaEnabled = isTest || isDebugMode || (isProd && Boolean(config.gaTrackingID));

/* istanbul ignore next */
function logTrackingCalls() {
  const calls = ReactGA.testModeAPI.calls;
  for (let i = 0; i < calls.length; i++) {
    // eslint-disable-next-line no-console
    console.log('[react-ga]', ...calls[i]);
  }
  calls.length = 0;
}

export function trackPageView(pathname: string, search: ?string) {
  if (isGaEnabled) {
    const pagePath = search ? `${pathname}${search}` : pathname;
    ReactGA.pageview(pagePath);
    if (isDebugMode) {
      logTrackingCalls();
    }
  }
}

export function trackError(description: string) {
  if (isGaEnabled) {
    let msg = description;
    if (!/^jaeger/i.test(msg)) {
      msg = `jaeger/${msg}`;
    }
    msg = msg.slice(0, 149);
    ReactGA.exception({ description: msg, fatal: false });
    if (isDebugMode) {
      logTrackingCalls();
    }
  }
}

export function trackEvent(data: EventData) {
  if (isGaEnabled) {
    const event = {};
    let category = data.category;
    if (!category) {
      category = 'jaeger/event';
    } else if (!/^jaeger/i.test(category)) {
      category = `jaeger/${category}`.slice(0, EVENT_LENGTHS.category);
    } else {
      category = category.slice(0, EVENT_LENGTHS.category);
    }
    event.category = category;
    event.action = data.action ? data.action.slice(0, EVENT_LENGTHS.action) : 'jaeger/action';
    if (data.label) {
      event.label = data.label.slice(0, EVENT_LENGTHS.label);
    }
    if (data.value != null) {
      event.value = Number(data.value);
    }
    ReactGA.event(event);
    if (isDebugMode) {
      logTrackingCalls();
    }
  }
}

function trackRavenError(ravenData: RavenTransportOptions) {
  const data = convRavenToGa(ravenData);
  if (isDebugMode) {
    /* istanbul ignore next */
    Object.keys(data).forEach(key => {
      if (key === 'message') {
        return;
      }
      let valueLen = '';
      if (typeof data[key] === 'string') {
        valueLen = `- value length: ${data[key].length}`;
      }
      // eslint-disable-next-line no-console
      console.log(key, valueLen);
      // eslint-disable-next-line no-console
      console.log(data[key]);
    });
  }
  trackError(data.message);
  trackEvent(data);
}

// Tracking needs to be initialized when this file is imported, e.g. early in
// the process of initializing the app, so Raven can wrap various resources,
// like `fetch()`, and generate breadcrumbs from them.

if (isGaEnabled) {
  let versionShort;
  let versionLong;
  if (process.env.REACT_APP_VSN_STATE) {
    try {
      const data = JSON.parse(process.env.REACT_APP_VSN_STATE);
      const joiner = [data.objName];
      if (data.changed.hasChanged) {
        joiner.push(data.changed.pretty);
      }
      versionShort = joiner.join(' ');
      versionLong = data.pretty;
    } catch (_) {
      versionShort = process.env.REACT_APP_VSN_STATE;
      versionLong = process.env.REACT_APP_VSN_STATE;
    }
    versionLong = versionLong.length > 99 ? `${versionLong.slice(0, 96)}...` : versionLong;
  } else {
    versionShort = 'unknown';
    versionLong = 'unknown';
  }
  const gaConfig = { testMode: isTest || isDebugMode, titleCase: false };
  ReactGA.initialize(config.gaTrackingID || 'debug-mode', gaConfig);
  ReactGA.set({
    appId: 'github.com/jaegertracing/jaeger-ui',
    appName: 'Jaeger UI',
    appVersion: versionLong,
  });
  const ravenConfig = {
    autoBreadcrumbs: {
      xhr: true,
      console: false,
      dom: true,
      location: true,
    },
    environment: process.env.NODE_ENV || 'unkonwn',
    transport: trackRavenError,
    tags: {},
  };
  if (versionShort && versionShort !== 'unknown') {
    ravenConfig.tags.git = versionShort;
  }
  Raven.config('https://fakedsn@omg.com/1', ravenConfig).install();
  window.onunhandledrejection = function trackRejectedPromise(evt) {
    Raven.captureException(evt.reason);
  };
  if (isDebugMode) {
    logTrackingCalls();
  }
}

export const context = isGaEnabled ? Raven : null;
