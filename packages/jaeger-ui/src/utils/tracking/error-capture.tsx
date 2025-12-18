// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Internal error capture types and utilities to replace Sentry SDK

export interface IStackFrame {
  filename?: string;
  function?: string;
  lineno?: number;
  colno?: number;
}

export interface IStacktrace {
  frames?: IStackFrame[];
}

export interface IException {
  type: string;
  value: string;
  stacktrace?: IStacktrace;
}

export interface IBreadcrumb {
  type?: string;
  category?: string;
  message?: string;
  data?: {
    [key: string]: any;
  };
  timestamp?: number;
}

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

// Breadcrumb storage
let breadcrumbsList: IBreadcrumb[] = [];
const MAX_BREADCRUMBS = 100;

export function addBreadcrumb(breadcrumb: IBreadcrumb) {
  breadcrumbsList.push({
    ...breadcrumb,
    timestamp: Date.now(),
  });
  if (breadcrumbsList.length > MAX_BREADCRUMBS) {
    breadcrumbsList = breadcrumbsList.slice(-MAX_BREADCRUMBS);
  }
}

export function getBreadcrumbs(): IBreadcrumb[] {
  return [...breadcrumbsList];
}

export function clearBreadcrumbs() {
  breadcrumbsList = [];
}

// Parse error stack trace into structured format
function parseStackTrace(error: Error): IStackFrame[] {
  if (!error.stack) {
    return [];
  }

  const frames: IStackFrame[] = [];
  const stackLines = error.stack.split('\n');

  for (const line of stackLines) {
    // Skip the error message line
    if (line.includes(error.message)) {
      continue;
    }

    // Match Chrome/Edge stack format: "    at functionName (filename:line:col)"
    // or "    at filename:line:col"
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

    // Match Firefox/Safari stack format: "functionName@filename:line:col"
    const firefoxMatch = line.match(/^(.+?)@(.+?):(\d+):(\d+)$/);
    if (firefoxMatch) {
      const [, functionName, filename, lineno, colno] = firefoxMatch;
      frames.push({
        function: functionName || '??',
        filename: filename || '',
        lineno: parseInt(lineno, 10),
        colno: parseInt(colno, 10),
      });
      continue;
    }
  }

  return frames;
}

// Convert error to Exception format
export function createException(error: Error): IException {
  const errorName = error.name || 'Error';
  const errorMessage = error.message || 'Unknown error';

  return {
    type: errorName,
    value: errorMessage,
    stacktrace: {
      frames: parseStackTrace(error),
    },
  };
}

// Create an Event from an error
export function createErrorEvent(error: Error, tags?: { [key: string]: string }): IEvent {
  return {
    exception: {
      values: [createException(error)],
    },
    breadcrumbs: {
      values: getBreadcrumbs(),
    },
    request: {
      url: window.location.href,
    },
    tags: tags || {},
    extra: {
      'session:duration': Date.now() - (window as any).__SESSION_START_TIME || 0,
    },
  };
}

// Initialize session start time
if (typeof window !== 'undefined') {
  (window as any).__SESSION_START_TIME = Date.now();
}

// Helper to generate CSS path for an element
function getCSSPath(element: HTMLElement): string {
  if (!element || element.nodeType !== 1) {
    return '';
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current.nodeType === 1 && path.length < 5) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    } else {
      // Add classes
      if (current.className) {
        const classes = current.className
          .split(/\s+/)
          .filter(c => c && c.trim())
          .slice(0, 2)
          .join('.');
        if (classes) {
          selector += `.${classes}`;
        }
      }

      // Add attributes
      const attrs = ['type', 'name', 'role'];
      for (const attr of attrs) {
        const value = current.getAttribute(attr);
        if (value) {
          selector += `[${attr}="${value}"]`;
          break;
        }
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Setup breadcrumb integrations
export interface IBreadcrumbIntegrationOptions {
  xhr?: boolean;
  fetch?: boolean;
  console?: boolean;
  dom?: boolean;
}

export function setupBreadcrumbIntegrations(options: IBreadcrumbIntegrationOptions = {}) {
  const { console: trackConsole = false, dom = true, fetch: trackFetch = true } = options;

  // Track fetch/XHR requests
  if (trackFetch && typeof window !== 'undefined') {
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

  // Track DOM events (clicks, inputs)
  if (dom && typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener(
      'click',
      event => {
        const target = event.target as HTMLElement;
        const selector = getCSSPath(target);
        addBreadcrumb({
          type: 'ui',
          category: 'ui.click',
          message: selector,
        });
      },
      true
    );

    document.addEventListener(
      'input',
      event => {
        const target = event.target as HTMLElement;
        const selector = getCSSPath(target);
        addBreadcrumb({
          type: 'ui',
          category: 'ui.input',
          message: selector,
        });
      },
      true
    );
  }

  // Track console errors
  if (trackConsole && typeof console !== 'undefined') {
    const originalConsoleError = console.error;
    console.error = function (...args: any[]) {
      addBreadcrumb({
        category: 'console',
        message: args.join(' '),
      });
      return originalConsoleError.apply(console, args);
    };
  }
}

// Track navigation changes
export function trackNavigation(to: string) {
  addBreadcrumb({
    category: 'navigation',
    data: {
      to,
    },
  });
}

// Error handler type
export type ErrorHandler = (event: IEvent) => IEvent | null;

let errorHandler: ErrorHandler | null = null;

export function setErrorHandler(handler: ErrorHandler) {
  errorHandler = handler;
}

// Capture exception manually
export function captureException(error: Error | any, tags?: { [key: string]: string }) {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const event = createErrorEvent(errorObj, tags);

  // Add error as breadcrumb
  addBreadcrumb({
    category: 'sentry',
    message: `${errorObj.name}: ${errorObj.message}`,
  });

  if (errorHandler) {
    const result = errorHandler(event);
    if (result) {
      // Handler processed the event
      return;
    }
  }
}

// Initialize error capture
export interface IInitOptions {
  dsn?: string; // Ignored, for compatibility
  environment?: string;
  tags?: { [key: string]: string };
  beforeSend?: ErrorHandler;
  integrations?: IBreadcrumbIntegrationOptions[];
}

export function init(options: IInitOptions = {}) {
  const { beforeSend, integrations = [], tags = {} } = options;

  if (beforeSend) {
    setErrorHandler(beforeSend);
  }

  // Setup integrations
  const integrationOptions: IBreadcrumbIntegrationOptions = integrations.reduce(
    (acc, integration) => ({ ...acc, ...integration }),
    {}
  );
  setupBreadcrumbIntegrations(integrationOptions);

  // Setup global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('error', event => {
      const error = event.error || new Error(event.message);
      captureException(error, tags);
    });

    window.addEventListener('unhandledrejection', event => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      captureException(error, tags);
    });
  }
}

// Mock BrowserClient for type compatibility
export class BrowserClient {
  static context(callback: () => void) {
    callback();
  }
}

// Integration helper for breadcrumbs (matches Sentry API)
export function breadcrumbsIntegration(options: IBreadcrumbIntegrationOptions) {
  return options;
}
