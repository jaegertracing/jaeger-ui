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

// In test mode if development and envvar REACT_APP_GA_DEBUG is true-ish
const isDebugMode =
  (isDev && isTruish(process.env.REACT_APP_GA_DEBUG)) ||
  isTruish(queryString.parse(_get(window, 'location.search'))['ga-debug']);

const config = getConfig();
// enable for debug or if in prod with a GA ID
const isGaEnabled = isDebugMode || (isProd && Boolean(config.gaTrackingID));

let appVersion;
if (process.env.REACT_APP_VSN_STATE) {
  try {
    appVersion = JSON.parse(process.env.REACT_APP_VSN_STATE);
    const joiner = [appVersion.objName];
    if (appVersion.changed.hasChanged) {
      joiner.push(appVersion.changed.pretty);
    }
    appVersion.shortPretty = joiner.join(' ');
  } catch (_) {
    appVersion = {
      pretty: process.env.REACT_APP_VSN_STATE,
      shortPretty: process.env.REACT_APP_VSN_STATE,
    };
  }
} else {
  appVersion = {
    pretty: 'unknown',
    shortPretty: 'unknown',
  };
}

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
      msg = `jaeger/${msg}`.slice(0, 149);
    }
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
    if (data.action) {
      event.action = data.action.slice(0, EVENT_LENGTHS.action);
    }
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
  const { message, ...gaData } = convRavenToGa(ravenData);
  if (isDebugMode) {
    Object.keys(gaData).forEach(key => {
      // eslint-disable-next-line no-console
      console.log(key);
      // eslint-disable-next-line no-console
      console.log(gaData[key]);
    });
  }
  trackError(message);
  trackEvent(gaData);
}

// Tracking needs to be initialized when this file is imported, e.g. early in
// the process of initializing the app, so Raven can wrap various resources,
// like `fetch()`, and generate breadcrumbs from them.

if (isGaEnabled) {
  const abbr = appVersion.pretty.length > 99 ? `${appVersion.pretty.slice(0, 96)}...` : appVersion.pretty;
  const gaConfig = { testMode: isDebugMode, titleCase: false };
  ReactGA.initialize(config.gaTrackingID || 'debug-mode', gaConfig);
  ReactGA.set({
    appId: 'github.com/jaegertracing/jaeger-ui',
    appName: 'Jaeger UI',
    appVersion: abbr,
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
  if (appVersion.shortPretty && appVersion.shortPretty !== 'unknown') {
    ravenConfig.tags.git = appVersion.shortPretty;
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
