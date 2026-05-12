// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { detectBasePath, KNOWN_SUB_PATHS } from './detect-base-path';
// ROUTES is the array that App/index.tsx renders directly into <Routes>.
// Iterating over it here guarantees KNOWN_SUB_PATHS is tested against every
// path actually registered in the router — no separate list to keep in sync.
import { ROUTES } from '../components/App';

describe('KNOWN_SUB_PATHS covers every registered route', () => {
  // In the test environment pathPrefix is "", so prefixUrl('/search') === '/search'.
  // For each route, construct a realistic deep-link URL and verify detectBasePath
  // correctly strips it back to the mount prefix.
  const MOUNT = '/pfx';

  for (const { path: routePath } of ROUTES) {
    // Replace React Router param placeholders with concrete values.
    const concreteSegment = routePath.replace(/:id\b/g, 'abc123').replace(/\*/g, '');
    const pathname = `${MOUNT}${concreteSegment}`;
    it(`detectBasePath("${pathname}") === "${MOUNT}/" for route ${routePath}`, () => {
      expect(detectBasePath(pathname)).toBe(`${MOUNT}/`);
    });
  }
});

describe('detectBasePath()', () => {
  describe('at root prefix', () => {
    it('handles bare root', () => {
      expect(detectBasePath('/')).toBe('/');
    });

    it('handles empty string (non-browser environment)', () => {
      expect(detectBasePath('')).toBe('/');
    });

    for (const sub of KNOWN_SUB_PATHS) {
      const pathname = sub.endsWith('/') ? `${sub}abc123` : sub;
      it(`strips "${pathname}" to "/"`, () => {
        expect(detectBasePath(pathname)).toBe('/');
      });
    }
  });

  describe('at /jaeger/ prefix', () => {
    it('handles bare prefix', () => {
      expect(detectBasePath('/jaeger/')).toBe('/jaeger/');
    });

    for (const sub of KNOWN_SUB_PATHS) {
      const rest = sub.endsWith('/') ? `${sub}abc123` : sub;
      const pathname = `/jaeger${rest}`;
      it(`strips "${pathname}" to "/jaeger/"`, () => {
        expect(detectBasePath(pathname)).toBe('/jaeger/');
      });
    }
  });

  describe('at /a/b/c/ prefix', () => {
    it('handles bare deep prefix', () => {
      expect(detectBasePath('/a/b/c/')).toBe('/a/b/c/');
    });

    it('strips /a/b/c/search to /a/b/c/', () => {
      expect(detectBasePath('/a/b/c/search')).toBe('/a/b/c/');
    });

    it('strips /a/b/c/trace/deadbeef to /a/b/c/', () => {
      expect(detectBasePath('/a/b/c/trace/deadbeef')).toBe('/a/b/c/');
    });
  });

  describe('prefix that contains a known sub-path segment (rightmost-match)', () => {
    it('mount at /a/search/ with deep link /a/search/trace/abc → /a/search/', () => {
      expect(detectBasePath('/a/search/trace/abc')).toBe('/a/search/');
    });

    it('mount at /a/search/ with path /a/search/search → /a/search/', () => {
      expect(detectBasePath('/a/search/search')).toBe('/a/search/');
    });

    it('mount at /a/trace/ with deep link /a/trace/trace/abc → /a/trace/', () => {
      expect(detectBasePath('/a/trace/trace/abc')).toBe('/a/trace/');
    });

    it('mount at /jaeger/search/ with deep link /jaeger/search/trace/abc → /jaeger/search/', () => {
      expect(detectBasePath('/jaeger/search/trace/abc')).toBe('/jaeger/search/');
    });
  });
});
