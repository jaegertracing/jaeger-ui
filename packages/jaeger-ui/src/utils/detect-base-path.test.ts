// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { detectBasePath, KNOWN_SUB_PATHS } from './detect-base-path';

describe('detectBasePath()', () => {
  describe('at root prefix', () => {
    it('handles bare root', () => {
      expect(detectBasePath('/')).toBe('/');
    });

    it('handles root with no trailing slash', () => {
      // edge case: some environments may not include trailing slash
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
});
