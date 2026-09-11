// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as ReactRouterDom from 'react-router-dom';

import { ROUTE_PATH, matches, getUrl, getDiffIds, isDiffUrl } from './url';

vi.mock('react-router-dom', () => ({
  matchPath: vi.fn(),
}));

describe('TraceDiff/url', () => {
  describe('matches', () => {
    const path = 'path argument';

    beforeEach(() => {
      ReactRouterDom.matchPath.mockReset();
    });

    it('calls matchPath with ROUTE_PATH and pathname', () => {
      matches(path);
      expect(ReactRouterDom.matchPath).toHaveBeenLastCalledWith(ROUTE_PATH, path);
    });

    it('returns false when matchPath returns null', () => {
      ReactRouterDom.matchPath.mockReturnValueOnce(null);
      expect(matches('/trace/abc...def')).toBe(false);
    });

    it('returns false when path matches /trace/:id but is not a compare URL (no ...)', () => {
      ReactRouterDom.matchPath.mockReturnValueOnce({ params: { id: 'abc123' } });
      expect(matches('/trace/abc123')).toBe(false);
    });

    it('returns true when matchPath matches and path is a compare URL (contains ...)', () => {
      ReactRouterDom.matchPath.mockReturnValueOnce({ params: { id: 'a...b' } });
      expect(matches('/trace/a...b')).toBe(true);
    });
  });

  describe('getUrl', () => {
    it('handles an empty state', () => {
      expect(getUrl({})).toBe('/trace/...');
    });

    it('handles a single traceId', () => {
      const cohort = ['first'];
      expect(getUrl({ cohort })).toBe(`/trace/${cohort[0]}...?cohort=${cohort[0]}`);
    });

    it('handles multiple traceIds', () => {
      const cohort = ['first', 'second', 'third'];
      const result = getUrl({ cohort });
      expect(result).toMatch(`${cohort[0]}...${cohort[1]}`);
      cohort.forEach(cohortEntry => {
        expect(result).toMatch(`cohort=${cohortEntry}`);
      });
    });
  });

  describe('isDiffUrl', () => {
    it('returns false for undefined', () => {
      expect(isDiffUrl(undefined)).toBe(false);
    });

    it('returns false for a plain trace ID (no ...)', () => {
      expect(isDiffUrl('abc123')).toBe(false);
    });

    it('returns true for a diff URL segment (contains ...)', () => {
      expect(isDiffUrl('a...b')).toBe(true);
    });
  });
  describe('getDiffIds', () => {
    it('returns empty object when id is undefined', () => {
      expect(getDiffIds(undefined)).toEqual({});
    });

    it('returns empty object when id does not contain "..."', () => {
      expect(getDiffIds('abc')).toEqual({});
    });

    it('splits a...b into a and b', () => {
      expect(getDiffIds('a...b')).toEqual({ a: 'a', b: 'b' });
    });

    it('splits a... into a and undefined', () => {
      expect(getDiffIds('a...')).toEqual({ a: 'a', b: undefined });
    });

    it('splits ...b into undefined and b', () => {
      expect(getDiffIds('...b')).toEqual({ a: undefined, b: 'b' });
    });
  });
});
