// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * First-path-segment prefixes of every registered top-level SPA route.
 * When index.html is served for a deep link (e.g. /jaeger/trace/abc), stripping
 * the matching sub-path yields the mount-point prefix (/jaeger/).
 *
 * Keep this list in sync with the ROUTE_PATH constants in each component's url.ts
 * and with the equivalent inline script in index.html.
 */
export const KNOWN_SUB_PATHS = [
  '/deep-dependencies',
  '/dependencies',
  '/quality-metrics',
  '/plexus-demo',
  '/monitor',
  '/search',
  '/trace/',
];

/**
 * Derive the UI mount-point prefix from a full pathname.
 *
 * Examples:
 *   "/"                     → "/"
 *   "/search"               → "/"
 *   "/jaeger/"              → "/jaeger/"
 *   "/jaeger/search"        → "/jaeger/"
 *   "/jaeger/trace/abc123"  → "/jaeger/"
 */
export function detectBasePath(pathname: string): string {
  for (const sub of KNOWN_SUB_PATHS) {
    const idx = pathname.indexOf(sub);
    if (idx !== -1) {
      const prefix = pathname.slice(0, idx + 1); // up to and including the slash before sub-path
      return prefix || '/';
    }
  }
  // No known sub-path found: pathname is either "/" or the bare prefix (e.g. "/jaeger/").
  if (pathname[pathname.length - 1] !== '/') {
    return pathname + '/';
  }
  return pathname;
}
