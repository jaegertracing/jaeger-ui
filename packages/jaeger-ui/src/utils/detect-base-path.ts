// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Keep KNOWN_SUB_PATHS in sync with the ROUTE_PATH constants in each component's url.ts
// and with the equivalent inline script in index.html (see ADR-009).
// The unit tests in detect-base-path.test.ts enforce that every ROUTE_PATH is listed here.
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
 * We use the *rightmost* match so that a deployment prefix that itself contains
 * a known sub-path segment (e.g. mount at /a/search/) is handled correctly:
 *   "/a/search/trace/abc"  → rightmost match is "/trace/" at index 9 → "/a/search/"
 *
 * Examples:
 *   "/"                      → "/"
 *   "/search"                → "/"
 *   "/jaeger/"               → "/jaeger/"
 *   "/jaeger/search"         → "/jaeger/"
 *   "/jaeger/trace/abc123"   → "/jaeger/"
 *   "/a/search/trace/abc"    → "/a/search/"
 */
export function detectBasePath(pathname: string): string {
  // pathname is always at least "/" in a browser; guard for test environments.
  if (!pathname) return '/';

  let bestIdx = -1;
  for (const sub of KNOWN_SUB_PATHS) {
    const idx = pathname.lastIndexOf(sub);
    if (idx !== -1 && idx > bestIdx) {
      bestIdx = idx;
    }
  }
  if (bestIdx !== -1) {
    const prefix = pathname.slice(0, bestIdx + 1); // keep the slash before the sub-path
    return prefix || '/';
  }
  // No known sub-path found: pathname is either "/" or the bare prefix (e.g. "/jaeger/").
  if (pathname[pathname.length - 1] !== '/') {
    return pathname + '/';
  }
  return pathname;
}
