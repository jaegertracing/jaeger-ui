// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _get from 'lodash/get';
import {
  IErrorData,
  IErrorContext,
  IBreadcrumb,
  captureException,
  init as ErrorCaptureInit,
  trackNavigation,
  formatErrorMessage,
} from './error-capture';

import { TNil } from '../../types';
import { Config } from '../../types/config';
import { IWebAnalyticsFunc } from '../../types/tracking';
import { getAppEnvironment, shouldDebugGoogleAnalytics } from '../constants';
import parseQuery from '../parseQuery';
import prefixUrl from '../prefix-url';

// Modify the `window` object to have an additional attribute `dataLayer`
// This is required by the gtag.js script to work

interface WindowWithGATracking extends Window {
  dataLayer: (string | object)[][] | undefined;
}

declare let window: WindowWithGATracking;

// GA-specific formatting utilities
let origin: string | null = null;
function getOrigin(): string {
  if (origin === null && typeof window !== 'undefined') {
    origin = window.location.origin + prefixUrl('');
  }
  return origin || '';
}

const warn = console.warn.bind(console);

const UNKNOWN_SYM = { sym: '??', word: '??' };

const NAV_SYMBOLS = [
  { sym: 'dp', word: 'dependencies', rx: /^\/dep/i },
  { sym: 'tr', word: 'trace', rx: /^\/trace/i },
  { sym: 'sd', word: 'search', rx: /^\/search\?./i },
  { sym: 'sr', word: 'search', rx: /^\/search/i },
  { sym: 'rt', word: 'home', rx: /^\/$/ },
];

const FETCH_SYMBOLS = [
  { sym: 'svc', word: '', rx: /^\/api\/services$/i },
  { sym: 'op', word: '', rx: /^\/api\/.*?operations$/i },
  { sym: 'sr', word: '', rx: /^\/api\/traces\?/i },
  { sym: 'tr', word: '', rx: /^\/api\/traces\/./i },
  { sym: 'dp', word: '', rx: /^\/api\/dep/i },
  { sym: '__IGNORE__', word: '', rx: /\.js(\.map)?$/i },
];

function truncate(str: string, len: number, front = false) {
  if (str.length > len) {
    if (!front) {
      return `${str.slice(0, len - 1)}~`;
    }
    return `~${str.slice(1 - len)}`;
  }
  return str;
}

function getSym(syms: typeof NAV_SYMBOLS | typeof FETCH_SYMBOLS, str: string) {
  for (let i = 0; i < syms.length; i++) {
    const { rx } = syms[i];
    if (rx.test(str)) {
      return syms[i];
    }
  }
  warn(`Unable to find symbol for: "${str}"`);
  return UNKNOWN_SYM;
}

function compressCssSelector(selector: string) {
  return selector
    .replace(/\.(?=\s|$)/g, '')
    .replace(/\.ub-[^. [:]+/g, '')
    .replace(/^(\w+ > )+/, '')
    .replace(/(^| )\w+?(?=\.)/g, '$1')
    .replace(/ > /g, ' >');
}

// GA-specific stack formatting that removes Jaeger-specific paths
function formatStackForGA(stack: string | undefined): string {
  if (!stack) {
    return '';
  }

  const lines: string[] = [];
  const stackLines = stack.split('\n');

  for (const line of stackLines) {
    // Clean up the line - remove origin, static/js prefix, and collapse whitespace
    let cleaned = line
      .replace(getOrigin(), '')
      .replace(/\/static\/js\//gi, '')
      .trim();

    // Collapse whitespace
    cleaned = cleaned.replace(/\s\s+/g, ' ');

    if (cleaned) {
      lines.push(cleaned);
    }
  }

  return lines.join('\n');
}

function formatBreadcrumbs(crumbs: IBreadcrumb[]): string {
  if (!Array.isArray(crumbs) || !crumbs.length) {
    return '';
  }

  let iLastUi = -1;
  for (let i = crumbs.length - 1; i >= 0; i--) {
    if (crumbs[i]?.category?.slice(0, 2) === 'ui') {
      iLastUi = i;
      break;
    }
  }

  let joiner: string[] = [];
  let onNewLine = true;

  for (let i = 0; i < crumbs.length; i++) {
    const c = crumbs[i];
    const cStart = c.category?.split('.')[0];

    switch (cStart) {
      case 'fetch': {
        if (c.data) {
          const { url, status_code } = c.data;
          const statusStr = status_code === 200 ? '' : `|${status_code}`;
          const sym = getSym(FETCH_SYMBOLS, url);
          if (sym.sym !== '__IGNORE__') {
            joiner.push(`[${sym.sym}${statusStr}]`);
            onNewLine = false;
          }
        }
        break;
      }

      case 'navigation': {
        if (c.data?.to) {
          const sym = getSym(NAV_SYMBOLS, c.data.to);
          joiner.push(`${onNewLine ? '' : '\n'}\n${sym.sym}\n`);
          onNewLine = true;
        }
        break;
      }

      case 'ui': {
        if (c.category && i === iLastUi) {
          const selector = c.message ? compressCssSelector(c.message) : null;
          joiner.push(`${c.category[3]}{${selector}}`);
        } else if (c.category) {
          joiner.push(c.category[3]);
        }
        onNewLine = false;
        break;
      }

      case 'error': {
        const msg = c.message ? truncate(formatErrorMessage(c.message), 58) : null;
        joiner.push(`${onNewLine ? '' : '\n'}${msg}\n`);
        onNewLine = true;
        break;
      }

      default:
      // skip
    }
  }

  joiner = joiner.filter(Boolean);

  // Compact repeating UI chars
  let c = '';
  let ci = -1;
  const compacted = joiner.reduce((accum: string[], value: string, j: number): string[] => {
    if (value === c) {
      return accum;
    }
    if (c) {
      if (j - ci > 1) {
        accum.push(String(j - ci));
      }
      c = '';
      ci = -1;
    }
    accum.push(value);
    if (value.length === 1) {
      c = value;
      ci = j;
    }
    return accum;
  }, []);

  return compacted
    .join('')
    .trim()
    .replace(/\n\n\n/g, '\n');
}

function formatErrorForGA(
  error: IErrorData,
  context: IErrorContext
): {
  message: string;
  category: string;
  action: string;
  label: string;
  value: number;
} {
  const errorType = error.name || 'Error';
  const errorValue = error.message || 'Unknown error';

  // Format message
  const message = truncate(formatErrorMessage(`${errorType}: ${errorValue}`), 149);

  // Format stack trace
  const stack = formatStackForGA(error.stack);

  // Get page info
  const url = truncate(context.url.replace(getOrigin(), ''), 50);
  const { word: page } = getSym(NAV_SYMBOLS, url);

  // Calculate duration
  const value = Math.round(context.sessionDuration / 1000);

  // Build category
  const category = `jaeger/${page}/error`;

  // Build action (message + tags + url + stack)
  let action = [message, context.tags.git, url, '', stack].filter(v => v != null).join('\n');
  action = truncate(action, 499);

  // Build label (message + page + duration + git + breadcrumbs)
  const header = [message, page, value, context.tags.git, ''].filter(v => v != null).join('\n');
  const crumbs = formatBreadcrumbs(context.breadcrumbs);
  const label = `${header}\n${truncate(crumbs, 498 - header.length, true)}`;

  return {
    message,
    category,
    action,
    label,
    value,
  };
}

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
  const context = isErrorsEnabled ? true : null;
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

  const trackErrorData = (error: IErrorData, context: IErrorContext) => {
    const gaData = formatErrorForGA(error, context);
    trackError(gaData.message);
    trackEvent(gaData.category, gaData.action, gaData.label, gaData.value);
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
      ErrorCaptureInit({
        onError: trackErrorData,
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
    trackNavigation(pagePath);
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
