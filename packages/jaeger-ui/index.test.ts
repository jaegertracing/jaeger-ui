// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// ROUTES is the array rendered directly into <Routes> in App/index.tsx.
// Importing it here means the coverage test automatically covers any new
// route added to the router without requiring manual updates to this file.
import { ROUTES } from './src/components/App/routes';

// Extract and compile the base-path detection script from index.html once
// to test the base path determination logic.
const indexHtml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf-8');
// Locate the script that tags <base> with data-inject-target="BASE_URL" — that attribute
// is unique to this script and survives tag-attribute additions or script reordering.
const scriptMatch = indexHtml.match(
  /<script[^>]*>([\s\S]*?'data-inject-target', 'BASE_URL'[\s\S]*?)<\/script>/i
);
if (!scriptMatch) throw new Error('No base-path detection script found in index.html');
// eslint-disable-next-line no-new-func
const scriptFn = new Function('document', 'window', scriptMatch[1]);

const ORIGIN = 'https://jaeger.example:8443';

interface ILocation {
  href: string;
  origin: string;
  pathname: string;
}

// Runs the script with the given window.location and returns the href of the
// <base> element it inserts after itself.
function runScript(location: ILocation): string {
  const attrs: Record<string, string> = {};
  let inserted: unknown = null;
  const base = {
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
    },
  };
  const mockDoc = {
    createElement: (tag: string) => {
      if (tag !== 'base') throw new Error(`Unexpected element: ${tag}`);
      return base;
    },
    currentScript: {
      after: (node: unknown) => {
        inserted = node;
      },
    },
    addEventListener: () => {},
    getElementById: () => null,
  };
  scriptFn(mockDoc, { location });
  if (inserted !== base) throw new Error('Script did not insert the <base> element');
  expect(attrs['data-inject-target']).toBe('BASE_URL');
  return attrs.href;
}

// Builds window.location the way a browser does, so the path is normalized
// (backslashes become slashes, dot segments are removed, and so on).
function detectBasePath(path: string): string {
  const url = new URL(`${ORIGIN}${path}`);
  return runScript({ href: url.href, origin: url.origin, pathname: url.pathname });
}

// The origin a browser resolves the page's assets against.
function assetOrigin(href: string): string {
  return new URL('./static/index.js', new URL(href, ORIGIN)).origin;
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

    it('falls back to / when the page URL cannot be a base', () => {
      expect(runScript({ href: 'about:blank', origin: 'null', pathname: '' })).toBe('/');
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
    it('ignores the query and fragment', () =>
      expect(detectBasePath('/jaeger/search?x=//evil.example/#//evil.example/')).toBe('/jaeger/'));
  });

  describe('at /a/b/c/ prefix', () => {
    it('handles bare deep prefix', () => expect(detectBasePath('/a/b/c/')).toBe('/a/b/c/'));
    it('strips /a/b/c/search to /a/b/c/', () => expect(detectBasePath('/a/b/c/search')).toBe('/a/b/c/'));
    it('strips /a/b/c/trace/deadbeef to /a/b/c/', () =>
      expect(detectBasePath('/a/b/c/trace/deadbeef')).toBe('/a/b/c/'));
  });

  describe('unknown route: no known sub-path present', () => {
    it('/unknown → /', () => expect(detectBasePath('/unknown')).toBe('/'));
    it('/jaeger/unknown-page → /jaeger/', () =>
      expect(detectBasePath('/jaeger/unknown-page')).toBe('/jaeger/'));
    it('/a/b/unknown → /a/b/', () => expect(detectBasePath('/a/b/unknown')).toBe('/a/b/'));
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

  describe('keeps assets on this origin for a crafted path', () => {
    // Each of these produced a <base href> on evil.example before the fix.
    const crafted = [
      '//evil.example/search',
      '/\\evil.example/search',
      '/.//evil.example/search',
      '/%2e%2e//evil.example/search',
      '/a/..//evil.example/search',
      '/&/evil.example/search',
    ];
    for (const path of crafted) {
      it(`${path} → same-origin base`, () => {
        expect(assetOrigin(detectBasePath(path))).toBe(ORIGIN);
      });
    }

    it('falls back to / when the path starts with //', () => {
      expect(detectBasePath('//evil.example/search')).toBe('/');
      expect(detectBasePath('/\\evil.example/search')).toBe('/');
    });

    it('falls back to / for a pathname the browser did not normalize', () => {
      const location = { href: `${ORIGIN}/`, origin: ORIGIN, pathname: '/.//evil.example/search' };
      expect(runScript(location)).toBe('/');
    });

    it('keeps characters instead of dropping them', () => {
      expect(detectBasePath('/&/evil.example/search')).toBe('/&/evil.example/');
      expect(detectBasePath('/a&b/search')).toBe('/a&b/');
    });

    it('keeps encoded slashes as a path', () => {
      expect(detectBasePath('/%2F%2Fevil.example/search')).toBe('/%2F%2Fevil.example/');
      expect(detectBasePath('/%5Cevil.example/search')).toBe('/%5Cevil.example/');
    });
  });
});
