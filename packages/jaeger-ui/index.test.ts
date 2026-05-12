// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// ROUTES is the array rendered directly into <Routes> in App/index.tsx.
// Importing it here means the coverage test automatically covers any new
// route added to the router without requiring manual updates to this file.
import { ROUTES } from './src/components/App';

// Extract and compile the base-path detection script from index.html once
// to test the base path determination logic.
const indexHtml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf-8');
// Extract the base-path detection script identified by the BASE_PATH_DETECT marker.
// Using a marker (rather than first-script heuristic) survives attribute additions or reordering.
const scriptMatch = indexHtml.match(/\/\* BASE_PATH_DETECT \*\/([\s\S]*?)<\/script>/i);
if (!scriptMatch) throw new Error('No BASE_PATH_DETECT script found in index.html');
// eslint-disable-next-line no-new-func
const scriptFn = new Function('document', 'window', scriptMatch[1]);

function detectBasePath(pathname: string): string {
  let insertedHtml = '';
  const mockDoc = {
    currentScript: {
      insertAdjacentHTML: (_pos: string, html: string) => {
        insertedHtml = html;
      },
    },
  };
  scriptFn(mockDoc, { location: { pathname } });
  const m = insertedHtml.match(/href="([^"]*)"/);
  if (!m) throw new Error(`Script produced no <base href>. Output: ${insertedHtml}`);
  return m[1];
}

describe('KNOWN_SUB_PATHS covers every registered route (enforcement)', () => {
  // In the test environment pathPrefix is "", so prefixUrl('/search') === '/search'.
  // For each route in the router, verify the inline script correctly resolves the prefix.
  const MOUNT = '/pfx';

  for (const { path: routePath } of ROUTES) {
    const concrete = routePath.replace(/:id\b/g, 'abc123').replace(/\*/g, '');
    const pathname = `${MOUNT}${concrete}`;
    it(`detectBasePath("${pathname}") === "${MOUNT}/" for route ${routePath}`, () => {
      expect(detectBasePath(pathname)).toBe(`${MOUNT}/`);
    });
  }
});

describe('inline base-path detection script', () => {
  describe('at root prefix', () => {
    it('handles bare root', () => {
      expect(detectBasePath('/')).toBe('/');
    });

    it('handles empty string (non-browser environment)', () => {
      expect(detectBasePath('')).toBe('/');
    });

    it('strips /search to /', () => expect(detectBasePath('/search')).toBe('/'));
    it('strips /trace/abc123 to /', () => expect(detectBasePath('/trace/abc123')).toBe('/'));
    it('strips /dependencies to /', () => expect(detectBasePath('/dependencies')).toBe('/'));
    it('strips /monitor to /', () => expect(detectBasePath('/monitor')).toBe('/'));
  });

  describe('at /jaeger/ prefix', () => {
    it('handles bare prefix', () => expect(detectBasePath('/jaeger/')).toBe('/jaeger/'));
    it('strips /jaeger/search to /jaeger/', () => expect(detectBasePath('/jaeger/search')).toBe('/jaeger/'));
    it('strips /jaeger/trace/abc to /jaeger/', () =>
      expect(detectBasePath('/jaeger/trace/abc')).toBe('/jaeger/'));
    it('strips /jaeger/dependencies to /jaeger/', () =>
      expect(detectBasePath('/jaeger/dependencies')).toBe('/jaeger/'));
  });

  describe('at /a/b/c/ prefix', () => {
    it('handles bare deep prefix', () => expect(detectBasePath('/a/b/c/')).toBe('/a/b/c/'));
    it('strips /a/b/c/search to /a/b/c/', () => expect(detectBasePath('/a/b/c/search')).toBe('/a/b/c/'));
    it('strips /a/b/c/trace/deadbeef to /a/b/c/', () =>
      expect(detectBasePath('/a/b/c/trace/deadbeef')).toBe('/a/b/c/'));
  });

  describe('rightmost match: prefix containing a known sub-path segment', () => {
    it('/a/search/trace/abc → /a/search/', () =>
      expect(detectBasePath('/a/search/trace/abc')).toBe('/a/search/'));
    it('/a/search/search → /a/search/', () => expect(detectBasePath('/a/search/search')).toBe('/a/search/'));
    it('/a/trace/trace/abc → /a/trace/', () =>
      expect(detectBasePath('/a/trace/trace/abc')).toBe('/a/trace/'));
    it('/jaeger/search/trace/abc → /jaeger/search/', () =>
      expect(detectBasePath('/jaeger/search/trace/abc')).toBe('/jaeger/search/'));
  });
});
