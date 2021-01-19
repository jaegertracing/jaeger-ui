// Copyright (c) 2021 Uber Technologies, Inc.
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
import Raven, { RavenOptions, RavenTransportOptions } from 'raven-js';

import convRavenToGa from './conv-raven-to-ga';
import { TNil, IWebAnalytics } from '../../types';

export default class GA implements IWebAnalytics {
  isDebugMode = false;
  context = null;
  isProd = process.env.NODE_ENV === 'production';
  isDev = process.env.NODE_ENV === 'development';
  isTest = process.env.NODE_ENV === 'test';
  gaID = null;
  isErrorsEnabled = false;

  private cookiesToDimensions = undefined;
  private EVENT_LENGTHS = {
    action: 499,
    category: 149,
    label: 499,
  };

  constructor(config: any) {
    this.isDebugMode =
      (this.isDev && GA.isTruish(process.env.REACT_APP_GA_DEBUG)) ||
      GA.isTruish(queryString.parse(_get(window, 'location.search'))['ga-debug']);

    this.gaID = _get(config, 'tracking.gaID');
    this.isErrorsEnabled = this.isDebugMode || Boolean(_get(config, 'tracking.trackErrors'));
    this.cookiesToDimensions = _get(config, 'tracking.cookiesToDimensions');

    this.context = this.isErrorsEnabled ? Raven : (null as any);
  }

  isEnabled() {
    return this.isTest || this.isDebugMode || (this.isProd && Boolean(this.gaID));
  }

  init() {
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
    const gaConfig = { testMode: this.isTest || this.isDebugMode, titleCase: false, debug: true };
    ReactGA.initialize(this.gaID || 'debug-mode', gaConfig);
    ReactGA.set({
      appId: 'github.com/jaegertracing/jaeger-ui',
      appName: 'Jaeger UI',
      appVersion: versionLong,
    });
    if (this.cookiesToDimensions !== undefined) {
      ((this.cookiesToDimensions as unknown) as Array<{ cookie: string; dimension: string }>).forEach(
        ({ cookie, dimension }: { cookie: string; dimension: string }) => {
          const match = ` ${document.cookie}`.match(new RegExp(`[; ]${cookie}=([^\\s;]*)`));
          if (match) ReactGA.set({ [dimension]: match[1] });
          // eslint-disable-next-line no-console
          else console.warn(`${cookie} not present in cookies, could not set dimension: ${dimension}`);
        }
      );
    }
    if (this.isErrorsEnabled) {
      const ravenConfig: RavenOptions = {
        autoBreadcrumbs: {
          xhr: true,
          console: false,
          dom: true,
          location: true,
        },
        environment: process.env.NODE_ENV || 'unkonwn',
        transport: this.trackRavenError.bind(this),
      };
      if (versionShort && versionShort !== 'unknown') {
        ravenConfig.tags = {
          git: versionShort,
        };
      }
      Raven.config('https://fakedsn@omg.com/1', ravenConfig).install();
      window.onunhandledrejection = function trackRejectedPromise(evt: PromiseRejectionEvent) {
        Raven.captureException(evt.reason);
      };
    }
    if (this.isDebugMode) {
      this.logTrackingCalls();
    }
  }

  trackPageView(pathname: string, search: string | TNil) {
    const pagePath = search ? `${pathname}${search}` : pathname;
    ReactGA.pageview(pagePath);
    if (this.isDebugMode) {
      this.logTrackingCalls();
    }
  }

  trackError(description: string) {
    let msg = description;
    if (!/^jaeger/i.test(msg)) {
      msg = `jaeger/${msg}`;
    }
    msg = msg.slice(0, 149);
    ReactGA.exception({ description: msg, fatal: false });
    if (this.isDebugMode) {
      this.logTrackingCalls();
    }
  }

  trackEvent(category: string, action: string, labelOrValue?: string | number | TNil, value?: number | TNil) {
    const event: {
      action: string;
      category: string;
      label?: string;
      value?: number;
    } = {
      category: !/^jaeger/i.test(category)
        ? `jaeger/${category}`.slice(0, this.EVENT_LENGTHS.category)
        : category.slice(0, this.EVENT_LENGTHS.category),
      action: action.slice(0, this.EVENT_LENGTHS.action),
    };
    if (labelOrValue != null) {
      if (typeof labelOrValue === 'string') {
        event.label = labelOrValue.slice(0, this.EVENT_LENGTHS.action);
      } else {
        // value should be an int
        event.value = Math.round(labelOrValue);
      }
    }
    if (value != null) {
      event.value = Math.round(value);
    }
    ReactGA.event(event);
    if (this.isDebugMode) {
      this.logTrackingCalls();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private logTrackingCalls() {
    const calls = ReactGA.testModeAPI.calls;
    for (let i = 0; i < calls.length; i++) {
      // eslint-disable-next-line no-console
      console.log('[react-ga]', ...calls[i]);
    }
    calls.length = 0;
  }

  private trackRavenError(ravenData: RavenTransportOptions) {
    const { message, category, action, label, value } = convRavenToGa(ravenData);
    this.trackError(message);
    this.trackEvent(category, action, label, value);
  }

  static isTruish(value?: string | string[]) {
    return Boolean(value) && value !== '0' && value !== 'false';
  }
}
