// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as reactRouterDomCompat from 'react-router-dom';

import { ROUTE_PATH, matches, getUrl } from './url';

vi.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
}));

describe('TraceDiff/url', () => {
  describe('matches', () => {
    const path = 'path argument';
    let matchPathSpy;

    beforeAll(() => {
      matchPathSpy = jest.spyOn(reactRouterDomCompat, 'matchPath');
    });

    it('calls matchPath with ROUTE_PATH and pathname', () => {
      matches(path);
      expect(matchPathSpy).toHaveBeenLastCalledWith(ROUTE_PATH, path);
    });

    it('returns false when matchPath returns null', () => {
      matchPathSpy.mockReturnValueOnce(null);
      expect(matches('/trace/abc...def')).toBe(false);
    });

    it('returns false when path matches /trace/:id but is not a compare URL (no ...)', () => {
      matchPathSpy.mockReturnValueOnce({ params: { id: 'abc123' } });
      expect(matches('/trace/abc123')).toBe(false);
    });

    it('returns true when matchPath matches and path is a compare URL (contains ...)', () => {
      matchPathSpy.mockReturnValueOnce({ params: { id: 'a...b' } });
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
});
