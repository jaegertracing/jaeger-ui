// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Minimal error capture implementation for tracking errors to Google Analytics

import { IException, IBreadcrumb } from './conv-sentry-to-ga';

// Event structure that gets passed to beforeSend callback
export interface IEvent {
  exception?: {
    values?: IException[];
  };
  breadcrumbs?: {
    values?: IBreadcrumb[];
  };
  request?: {
    url?: string;
  };
  tags?: {
    [key: string]: string;
  };
  extra?: {
    [key: string]: any;
  };
}

// Configuration options
interface IInitOptions {
  dsn?: string; // Ignored, kept for API compatibility
  environment?: string;
  tags?: { [key: string]: string };
  beforeSend?: (event: IEvent) => IEvent | null;
  integrations?: any[];
}

interface IBreadcrumbConfig {
  xhr?: boolean;
  console?: boolean;
  dom?: boolean;
  fetch?: boolean;
}

// Internal state
let breadcrumbsList: IBreadcrumb[] = [];
let beforeSendCallback: ((event: IEvent) => IEvent | null) | null = null;
let sessionStartTime = Date.now();
let errorTags: { [key: string]: string } = {};

const MAX_BREADCRUMBS = 100;

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
function parseStackTrace(error: Error): IException['stacktrace'] {
  if (!error.stack) {
    return undefined;
  }

  const frames: Array<{ filename?: string; function?: string; lineno?: number; colno?: number }> = [];
  const stackLines = error.stack.split('\n');

  for (const line of stackLines) {
    if (line.includes(error.message)) continue;

    // Chrome/Edge format: "    at functionName (filename:line:col)"
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

    // Firefox format: "functionName@filename:line:col"
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

  return frames.length > 0 ? { frames } : undefined;
}

// Create event from error
function createErrorEvent(error: Error): IEvent {
  const exception: IException = {
    type: error.name || 'Error',
    value: error.message || 'Unknown error',
    stacktrace: parseStackTrace(error),
  };

  return {
    exception: {
      values: [exception],
    },
    breadcrumbs: {
      values: [...breadcrumbsList],
    },
    request: {
      url: typeof window !== 'undefined' ? window.location.href : '',
    },
    tags: errorTags,
    extra: {
      'session:duration': Date.now() - sessionStartTime,
    },
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
  const event = createErrorEvent(errorObj);

  // Add error as breadcrumb
  addBreadcrumb({
    category: 'sentry',
    message: `${errorObj.name}: ${errorObj.message}`,
  });

  if (beforeSendCallback) {
    beforeSendCallback(event);
  }
}

export function init(options: IInitOptions = {}) {
  const { beforeSend, integrations = [], tags = {} } = options;

  beforeSendCallback = beforeSend || null;
  errorTags = tags;

  // Extract breadcrumb config from integrations
  const breadcrumbConfig = integrations.find(i => i && typeof i === 'object') || {};
  setupBreadcrumbs(breadcrumbConfig);

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

export function breadcrumbsIntegration(config: IBreadcrumbConfig) {
  return config;
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
