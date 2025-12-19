// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Error Capture Module
 *
 * Provides error capturing and breadcrumb tracking functionality for analytics.
 * This module is tracking-implementation agnostic - it captures errors and user
 * interactions, allowing the consumer to format the data as needed.
 *
 * Key features:
 * - Captures JavaScript errors (window.onerror, unhandledrejection)
 * - Tracks user interactions as breadcrumbs (navigation, fetch requests, DOM events)
 * - Provides error context including stack trace, breadcrumbs, and session duration
 *
 * Breadcrumbs are a chronological log of user actions and events that occurred before
 * an error. They provide context for debugging by showing what the user was doing
 * leading up to the error. Examples:
 * - Navigation: User navigated from /search to /trace/abc123
 * - Fetch: API call to /api/traces returned 404
 * - UI: User clicked on button.submit-btn
 * - UI: User typed into input#search-field
 *
 * Each breadcrumb contains:
 * - type: The type of event (e.g., 'http', 'ui', 'navigation')
 * - category: More specific categorization (e.g., 'fetch', 'ui.click')
 * - message: Human-readable description (e.g., CSS selector for UI events)
 * - data: Additional structured data (e.g., HTTP status code, URL)
 * - timestamp: When the event occurred
 *
 * Example usage:
 * ```typescript
 * import { init, captureException } from './error-capture';
 *
 * init({
 *   onError: (error, context) => {
 *     // Format and send error data to your analytics service
 *     console.log('Error:', error.message);
 *     console.log('Stack:', error.stack);
 *     console.log('Breadcrumbs:', context.breadcrumbs);
 *     // breadcrumbs will be an array like:
 *     // [
 *     //   { category: 'navigation', data: { to: '/search' }, timestamp: 1234567890 },
 *     //   { category: 'fetch', data: { url: '/api/traces', status_code: 200 }, timestamp: 1234567891 },
 *     //   { category: 'ui.click', message: 'button.search-btn', timestamp: 1234567892 }
 *     // ]
 *   },
 *   tags: { version: '1.0.0' }
 * });
 *
 * // Manually capture an error
 * captureException(new Error('Something went wrong'));
 * ```
 */

// Error data structure
export interface IErrorData {
  name: string;
  message: string;
  stack?: string;
}

// Context data provided with errors
export interface IErrorContext {
  breadcrumbs: IBreadcrumb[];
  tags: { [key: string]: string };
  sessionDuration: number;
  url: string;
}

// Breadcrumb structure
export interface IBreadcrumb {
  type?: string;
  category?: string;
  message?: string;
  data?: { [key: string]: any };
  timestamp?: number;
}

// Configuration options
interface IInitOptions {
  onError?: (error: IErrorData, context: IErrorContext) => void;
  tags?: { [key: string]: string };
}

// Internal state
let breadcrumbsList: IBreadcrumb[] = [];
let onErrorCallback: ((error: IErrorData, context: IErrorContext) => void) | null = null;
let sessionStartTime = Date.now();
let errorTags: { [key: string]: string } = {};

const MAX_BREADCRUMBS = 100;

// Utility functions for formatting

/**
 * Collapse whitespace in a string - replaces newlines with "|" and multiple spaces with single space
 */
function collapseWhitespace(value: string): string {
  return value.trim().replace(/\n/g, '|').replace(/\s\s+/g, ' ').trim();
}

/**
 * Format an error message by removing "Error:" prefix and cleaning up
 * Example: "TypeError: Cannot read property 'x'" -> "! Type! Cannot read property 'x'"
 */
export function formatErrorMessage(message: string): string {
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
  return parts.join('');
}

/**
 * Clean up a stack trace string by removing noise
 * - Removes error message line
 * - Collapses whitespace
 */
export function formatStackTrace(stack: string | undefined): string {
  if (!stack) {
    return '';
  }

  const lines: string[] = [];
  const stackLines = stack.split('\n');

  for (const line of stackLines) {
    // Collapse whitespace and trim
    const cleaned = line.replace(/\s\s+/g, ' ').trim();

    if (cleaned) {
      lines.push(cleaned);
    }
  }

  return lines.join('\n');
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

// Setup breadcrumb tracking with hardcoded settings
function setupBreadcrumbs() {
  if (typeof window === 'undefined') return;

  // Track fetch requests
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

  // Track DOM events (click and input)
  if (typeof document !== 'undefined') {
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

/**
 * Capture an error and trigger the error callback with context
 */
export function captureException(error: any) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Add error as breadcrumb
  addBreadcrumb({
    category: 'sentry',
    message: `${errorObj.name}: ${errorObj.message}`,
  });

  // Call callback with error and context
  if (onErrorCallback) {
    const context: IErrorContext = {
      breadcrumbs: [...breadcrumbsList],
      tags: errorTags,
      sessionDuration: Date.now() - sessionStartTime,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    const errorData: IErrorData = {
      name: errorObj.name || 'Error',
      message: errorObj.message || 'Unknown error',
      stack: errorObj.stack,
    };

    onErrorCallback(errorData, context);
  }
}

/**
 * Initialize error capture with callback and configuration
 */
export function init(options: IInitOptions = {}) {
  const { onError, tags = {} } = options;

  onErrorCallback = onError || null;
  errorTags = tags;

  // Setup breadcrumb tracking
  setupBreadcrumbs();

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

/**
 * Track a navigation event as a breadcrumb
 */
export function trackNavigation(to: string) {
  addBreadcrumb({
    category: 'navigation',
    data: { to },
  });
}
