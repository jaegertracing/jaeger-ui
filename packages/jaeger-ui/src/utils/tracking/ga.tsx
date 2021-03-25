// Copyright (c) 2021 The Jaeger Authors.
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
import { TNil } from '../../types';
import { Config } from '../../types/config';
import { IWebAnalyticsFunc } from '../../types/tracking';
import { logTrackingCalls } from './utils';

const isTruish = (value?: string | string[]) => {
  return Boolean(value) && value !== '0' && value !== 'false';
};

const GA: IWebAnalyticsFunc = (config: Config, versionShort: string, versionLong: string) => {
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  const isDebugMode =
    (isDev && isTruish(process.env.REACT_APP_GA_DEBUG)) ||
    isTruish(queryString.parse(_get(window, 'location.search'))['ga-debug']);
  const gaID = _get(config, 'tracking.gaID');
  const isErrorsEnabled = isDebugMode || Boolean(_get(config, 'tracking.trackErrors'));
  const cookiesToDimensions = _get(config, 'tracking.cookiesToDimensions');
  const context = isErrorsEnabled ? Raven : (null as any);
  const EVENT_LENGTHS = {
    action: 499,
    category: 149,
    label: 499,
  };

  const isEnabled = () => {
    return isTest || isDebugMode || (isProd && Boolean(gaID));
  };

  const trackError = (description: string) => {
    let msg = description;
    if (!/^jaeger/i.test(msg)) {
      msg = `jaeger/${msg}`;
    }
    msg = msg.slice(0, 149);
    ReactGA.exception({ description: msg, fatal: false });
    if (isDebugMode) {
      logTrackingCalls();
    }
  };

  const trackEvent = (
    category: string,
    action: string,
    labelOrValue?: string | number | TNil,
    value?: number | TNil
  ) => {
    const event: {
      action: string;
      category: string;
      label?: string;
      value?: number;
    } = {
      category: !/^jaeger/i.test(category)
        ? `jaeger/${category}`.slice(0, EVENT_LENGTHS.category)
        : category.slice(0, EVENT_LENGTHS.category),
      action: action.slice(0, EVENT_LENGTHS.action),
    };
    if (labelOrValue != null) {
      if (typeof labelOrValue === 'string') {
        event.label = labelOrValue.slice(0, EVENT_LENGTHS.action);
      } else {
        // value should be an int
        event.value = Math.round(labelOrValue);
      }
    }
    if (value != null) {
      event.value = Math.round(value);
    }
    ReactGA.event(event);
    if (isDebugMode) {
      logTrackingCalls();
    }
  };

  const trackRavenError = (ravenData: RavenTransportOptions) => {
    const { message, category, action, label, value } = convRavenToGa(ravenData);
    trackError(message);
    trackEvent(category, action, label, value);
  };

  const init = () => {
    if (!isEnabled()) {
      return;
    }

    const gaConfig = { testMode: isTest || isDebugMode, titleCase: false, debug: true };
    ReactGA.initialize(gaID || 'debug-mode', gaConfig);
    ReactGA.set({
      appId: 'github.com/jaegertracing/jaeger-ui',
      appName: 'Jaeger UI',
      appVersion: versionLong,
    });
    if (cookiesToDimensions !== undefined) {
      ((cookiesToDimensions as unknown) as Array<{ cookie: string; dimension: string }>).forEach(
        ({ cookie, dimension }: { cookie: string; dimension: string }) => {
          const match = ` ${document.cookie}`.match(new RegExp(`[; ]${cookie}=([^\\s;]*)`));
          if (match) ReactGA.set({ [dimension]: match[1] });
          // eslint-disable-next-line no-console
          else console.warn(`${cookie} not present in cookies, could not set dimension: ${dimension}`);
        }
      );
    }
    if (isErrorsEnabled) {
      const ravenConfig: RavenOptions = {
        autoBreadcrumbs: {
          xhr: true,
          console: false,
          dom: true,
          location: true,
        },
        environment: process.env.NODE_ENV || 'unkonwn',
        transport: trackRavenError,
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
    if (isDebugMode) {
      logTrackingCalls();
    }
  };

  const trackPageView = (pathname: string, search: string | TNil) => {
    const pagePath = search ? `${pathname}${search}` : pathname;
    ReactGA.pageview(pagePath);
    if (isDebugMode) {
      logTrackingCalls();
    }
  };

  return {
    isEnabled,
    init,
    context,
    trackPageView,
    trackError,
    trackEvent,
  };
};

export default GA;
