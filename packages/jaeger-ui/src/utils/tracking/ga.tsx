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
import {
  Event,
  BrowserClient,
  breadcrumbsIntegration,
  captureException,
  init as SentryInit,
} from '@sentry/browser';

import convSentryToGa from './conv-sentry-to-ga';
import { TNil } from '../../types';
import { Config } from '../../types/config';
import { IWebAnalyticsFunc } from '../../types/tracking';
import { getAppEnvironment, shouldDebugGoogleAnalytics } from '../constants';
import parseQuery from '../parseQuery';

// Modify the `window` object to have an additional attribute `dataLayer`
// This is required by the gtag.js script to work

// eslint-disable-next-line @typescript-eslint/naming-convention
interface WindowWithGATracking extends Window {
  dataLayer: (string | object)[][] | undefined;
}

function convertEventToTransportOptions(event: Event): { url: string; data: any } {
  return {
    url: event.request?.url || '',
    data: event,
  };
}

declare let window: WindowWithGATracking;

const isTruish = (value?: string | string[]) => {
  return Boolean(value) && value !== '0' && value !== 'false';
};

const GA: IWebAnalyticsFunc = (config: Config, versionShort: string, versionLong: string) => {
  const appEnv = getAppEnvironment();
  const isProd = appEnv === 'production';
  const isDev = appEnv === 'development';
  const isTest = appEnv === 'test';
  const isDebugMode =
    (isDev && isTruish(shouldDebugGoogleAnalytics())) ||
    isTruish(parseQuery(_get(window, 'location.search'))['ga-debug']);
  const gaID = _get(config, 'tracking.gaID');
  const isErrorsEnabled = isDebugMode || Boolean(_get(config, 'tracking.trackErrors'));
  const cookiesToDimensions = _get(config, 'tracking.cookiesToDimensions');
  const context = isErrorsEnabled ? BrowserClient : null;
  const EVENT_LENGTHS = {
    action: 499,
    category: 149,
    label: 499,
  };

  const isEnabled = () => {
    return isTest || isDebugMode || (isProd && Boolean(gaID));
  };

  // Function to add a new event to the Google Analytics dataLayer
  const gtag = (...args: (string | object)[]) => {
    if (window !== undefined)
      if (window.dataLayer !== undefined && Array.isArray(window.dataLayer)) {
        window.dataLayer.push(args);
        if (isDebugMode) {
          console.log('[GA Tracking]', ...args);
        }
      }
  };

  const trackError = (description: string) => {
    let msg = description;
    if (!/^jaeger/i.test(msg)) {
      msg = `jaeger/${msg}`;
    }
    msg = msg.slice(0, 149);

    gtag('event', 'exception', {
      description: msg,
      fatal: false,
    });
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

    gtag('event', event.action, {
      event_category: event.category,
      ...(event.label && { event_label: event.label }),
      ...(event.value && { event_value: event.value }),
    });
  };

  const trackSentryError = (sentryData: { url: string; data: any }) => {
    const { message, category, action, label, value } = convSentryToGa(sentryData);
    trackError(message);
    trackEvent(category, action, label, value);
  };

  const init = () => {
    if (!isEnabled()) {
      return;
    }

    const gtagUrl = 'https://www.googletagmanager.com/gtag/js';
    const GA_MEASUREMENT_ID = gaID || 'debug-mode';

    // Load the script asynchronously
    const script = document.createElement('script');
    script.async = true;
    script.src = `${gtagUrl}?id=${GA_MEASUREMENT_ID}`;
    document.body.appendChild(script);

    // Initialize the dataLayer and send initial configuration data
    window.dataLayer = window.dataLayer || [];
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
    gtag('set', {
      appId: 'github.com/jaegertracing/jaeger-ui',
      appName: 'Jaeger UI',
      appVersion: versionLong,
    });

    if (cookiesToDimensions !== undefined) {
      (cookiesToDimensions as unknown as Array<{ cookie: string; dimension: string }>).forEach(
        ({ cookie, dimension }: { cookie: string; dimension: string }) => {
          const match = ` ${document.cookie}`.match(new RegExp(`[; ]${cookie}=([^\\s;]*)`));
          if (match) {
            gtag('set', {
              [dimension]: match[1],
            });
          } else console.warn(`${cookie} not present in cookies, could not set dimension: ${dimension}`);
        }
      );
    }
    if (isErrorsEnabled) {
      SentryInit({
        dsn: 'https://fakedsn@omg.com/1',
        environment: getAppEnvironment() || 'unknown',
        integrations: [
          breadcrumbsIntegration({
            xhr: true,
            console: false,
            dom: true,
          }),
        ],
        beforeSend(event) {
          const transportOptions = convertEventToTransportOptions(event);
          trackSentryError(transportOptions);
          return event;
        },
        ...(versionShort &&
          versionShort !== 'unknown' && {
            tags: {
              git: versionShort,
            },
          }),
      });

      window.onunhandledrejection = function trackRejectedPromise(evt) {
        captureException(evt.reason);
      };
    }
  };

  const trackPageView = (pathname: string, search: string | TNil) => {
    const pagePath = search ? `${pathname}${search}` : pathname;
    gtag('event', 'page_view', {
      page_path: pagePath,
    });
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
