// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as reactRouterDom from 'react-router-dom';

import { ROUTE_PATH, matches, getUrl } from './url';

jest.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
}));

describe('TraceDiff/url', () => {
  describe('matches', () => {
    const path = 'path argument';
    let matchPathSpy;

    beforeAll(() => {
      matchPathSpy = jest.spyOn(reactRouterDom, 'matchPath');
    });

    it('calls matchPath with expected arguments', () => {
      matches(path);
      expect(matchPathSpy).toHaveBeenLastCalledWith(ROUTE_PATH, path);
    });

    it("returns truthiness of matchPath's return value", () => {
      matchPathSpy.mockReturnValueOnce(null);
      expect(matches(path)).toBe(false);
      matchPathSpy.mockReturnValueOnce({});
      expect(matches(path)).toBe(true);
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
