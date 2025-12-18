// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Minimal error capture that formats errors for Google Analytics

// GA-formatted error data
export interface IGAErrorData {
  message: string;
  category: string;
  action: string;
  label: string;
  value: number;
}

// Configuration options
interface IInitOptions {
  dsn?: string; // Ignored, kept for API compatibility
  environment?: string;
  tags?: { [key: string]: string };
  onError?: (gaData: IGAErrorData) => void;
  breadcrumbs?: IBreadcrumbConfig;
}

interface IBreadcrumbConfig {
  xhr?: boolean;
  console?: boolean;
  dom?: boolean;
  fetch?: boolean;
}

// Internal breadcrumb structure
interface IBreadcrumb {
  type?: string;
  category?: string;
  message?: string;
  data?: { [key: string]: any };
  timestamp?: number;
}

interface IStackFrame {
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
}

// Internal state
let breadcrumbsList: IBreadcrumb[] = [];
let onErrorCallback: ((gaData: IGAErrorData) => void) | null = null;
let sessionStartTime = Date.now();
let errorTags: { [key: string]: string } = {};

const MAX_BREADCRUMBS = 100;

// Lazy initialize origin to avoid importing prefixUrl at module load time
let origin: string | null = null;
function getOrigin(): string {
  if (origin === null && typeof window !== 'undefined') {
    const prefixUrl = require('../prefix-url').default;
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

// Utility functions

function truncate(str: string, len: number, front = false) {
  if (str.length > len) {
    if (!front) {
      return `${str.slice(0, len - 1)}~`;
    }
    return `~${str.slice(1 - len)}`;
  }
  return str;
}

function collapseWhitespace(value: string) {
  return value.trim().replace(/\n/g, '|').replace(/\s\s+/g, ' ').trim();
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

function convErrorMessage(message: string, maxLen = 0) {
  let msg = collapseWhitespace(message);
  const parts = ['! '];
  const j = msg.indexOf(':');
  if (j > -1) {
    const start = msg.slice(0, j).replace(/error/i, '').trim();
    if (start) {
      parts.push(start, '! ');
    }
    msg = msg.slice(j + 1);
  }
  parts.push(msg.trim());
  const rv = parts.join('');
  return maxLen ? truncate(rv, maxLen) : parts.join('');
}

function compressCssSelector(selector: string) {
  return selector
    .replace(/\.(?=\s|$)/g, '')
    .replace(/\.ub-[^. [:]+/g, '')
    .replace(/^(\w+ > )+/, '')
    .replace(/(^| )\w+?(?=\.)/g, '$1')
    .replace(/ > /g, ' >');
}

// Add a breadcrumb to the list
function addBreadcrumb(breadcrumb: IBreadcrumb) {
  breadcrumbsList.push({
    ...breadcrumb,
    timestamp: Date.now(),
  });
  if (breadcrumbsList.length > MAX_BREADCRUMBS) {
    breadcrumbsList = breadcrumbsList.slice(-MAX_BREADCRUMBS);
  }
}

// Parse error stack trace
function parseStackTrace(error: Error): IStackFrame[] {
  if (!error.stack) {
    return [];
  }

  const frames: IStackFrame[] = [];
  const stackLines = error.stack.split('\n');

  for (const line of stackLines) {
    if (line.includes(error.message)) continue;

    // Chrome/Edge format
    const chromeMatch = line.match(/^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
    if (chromeMatch) {
      const [, functionName, filename, lineno, colno] = chromeMatch;
      frames.push({
        function: functionName || '??',
        filename: filename || '',
        lineno: parseInt(lineno, 10),
        colno: parseInt(colno, 10),
      });
      continue;
    }

    // Firefox format
    const firefoxMatch = line.match(/^(.+?)@(.+?):(\d+):(\d+)$/);
    if (firefoxMatch) {
      const [, functionName, filename, lineno, colno] = firefoxMatch;
      frames.push({
        function: functionName || '??',
        filename: filename || '',
        lineno: parseInt(lineno, 10),
        colno: parseInt(colno, 10),
      });
    }
  }

  return frames;
}

// Convert stack frames to compact string
function formatStack(frames: IStackFrame[]): string {
  const formatted = frames.map(fr => {
    const filename = (fr.filename ?? '').replace(getOrigin(), '').replace(/^\/static\/js\//i, '');
    const fn = collapseWhitespace(fr.function || '??');
    return { filename, fn };
  });

  const joiner = [];
  let lastFile = '';
  for (let i = formatted.length - 1; i >= 0; i--) {
    const { filename, fn } = formatted[i];
    if (lastFile !== filename) {
      joiner.push(`> ${filename}`);
      lastFile = filename;
    }
    joiner.push(fn);
  }
  return joiner.join('\n');
}

// Convert breadcrumbs to compact string
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

      case 'sentry': {
        const msg = c.message ? convErrorMessage(c.message, 58) : null;
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

  if (c && ci !== joiner.length - 1) {
    compacted.push(String(joiner.length - ci));
  }

  return compacted
    .join('')
    .trim()
    .replace(/\n\n\n/g, '\n');
}

// Format error for Google Analytics
function formatErrorForGA(error: Error): IGAErrorData {
  const errorType = error.name || 'Error';
  const errorValue = error.message || 'Unknown error';
  const frames = parseStackTrace(error);

  // Format message
  const message = convErrorMessage(`${errorType}: ${errorValue}`, 149);

  // Format stack
  const stack = formatStack(frames);

  // Get page info
  const url = typeof window !== 'undefined' ? truncate(window.location.pathname, 50) : '';
  const { word: page } = getSym(NAV_SYMBOLS, url);

  // Calculate duration
  const duration = Date.now() - sessionStartTime;
  const value = Math.round(duration / 1000);

  // Build category
  const category = `jaeger/${page}/error`;

  // Build action (message + tags + url + stack)
  let action = [message, errorTags.git, url, '', stack].filter(v => v != null).join('\n');
  action = truncate(action, 499);

  // Build label (message + page + duration + git + breadcrumbs)
  const header = [message, page, value, errorTags.git, ''].filter(v => v != null).join('\n');
  const crumbs = formatBreadcrumbs(breadcrumbsList);
  const label = `${header}\n${truncate(crumbs, 498 - header.length, true)}`;

  return {
    message,
    category,
    action,
    label,
    value,
  };
}

// Helper to get CSS path for DOM elements
function getCSSPath(element: HTMLElement): string {
  if (!element || element.nodeType !== 1) return '';

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current.nodeType === 1 && path.length < 5) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(/\s+/)
        .filter(c => c && c.trim())
        .slice(0, 2)
        .join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }

    const attrs = ['type', 'name', 'role'];
    for (const attr of attrs) {
      const value = current.getAttribute(attr);
      if (value) {
        selector += `[${attr}="${value}"]`;
        break;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Setup breadcrumb tracking
function setupBreadcrumbs(config: IBreadcrumbConfig) {
  const { dom = true, fetch: trackFetch = true } = config;

  if (typeof window === 'undefined') return;

  // Track fetch requests
  if (trackFetch) {
    const originalFetch = window.fetch;
    window.fetch = function (...args: Parameters<typeof fetch>) {
      const url =
        typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : args[0].toString();

      return originalFetch.apply(this, args).then(
        response => {
          addBreadcrumb({
            type: 'http',
            category: 'fetch',
            data: {
              url,
              status_code: response.status,
              method: args[1]?.method || 'GET',
            },
          });
          return response;
        },
        error => {
          addBreadcrumb({
            type: 'http',
            category: 'fetch',
            data: {
              url,
              status_code: 0,
              error: error.message,
            },
          });
          throw error;
        }
      );
    };
  }

  // Track DOM events
  if (dom && typeof document !== 'undefined') {
    document.addEventListener(
      'click',
      event => {
        const target = event.target as HTMLElement;
        addBreadcrumb({
          type: 'ui',
          category: 'ui.click',
          message: getCSSPath(target),
        });
      },
      true
    );

    document.addEventListener(
      'input',
      event => {
        const target = event.target as HTMLElement;
        addBreadcrumb({
          type: 'ui',
          category: 'ui.input',
          message: getCSSPath(target),
        });
      },
      true
    );
  }
}

// Public API

export function captureException(error: any) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Add error as breadcrumb
  addBreadcrumb({
    category: 'sentry',
    message: `${errorObj.name}: ${errorObj.message}`,
  });

  // Format for GA and call callback
  if (onErrorCallback) {
    const gaData = formatErrorForGA(errorObj);
    onErrorCallback(gaData);
  }
}

export function init(options: IInitOptions = {}) {
  const { onError, breadcrumbs = {}, tags = {} } = options;

  onErrorCallback = onError || null;
  errorTags = tags;

  // Setup breadcrumb tracking
  setupBreadcrumbs(breadcrumbs);

  // Setup global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('error', event => {
      const error = event.error || new Error(event.message);
      captureException(error);
    });

    window.addEventListener('unhandledrejection', event => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      captureException(error);
    });
  }
}

export function trackNavigation(to: string) {
  addBreadcrumb({
    category: 'navigation',
    data: { to },
  });
}

// Mock BrowserClient for type compatibility
export class BrowserClient {
  static context(callback: () => void) {
    callback();
  }
}
