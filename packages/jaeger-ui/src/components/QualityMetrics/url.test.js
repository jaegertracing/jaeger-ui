// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as reactRouterDom from 'react-router-dom';

import { ROUTE_PATH, matches, getUrl, getUrlState } from './url';

jest.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
}));

describe('TraceDiff/url', () => {
  const lookback = 42;
  const service = 'test-service';

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
    it('handles an absent param arg', () => {
      expect(getUrl()).toBe(ROUTE_PATH);
    });

    it('handles param arg', () => {
      const arg = {
        lookback,
        service,
      };
      expect(getUrl(arg)).toBe(`${ROUTE_PATH}?lookback=${arg.lookback}&service=${arg.service}`);
    });
  });

  describe('getUrlState', () => {
    const defaultState = {
      lookback: 48,
    };

    it('defaults lookback to 48h', () => {
      expect(getUrlState('')).toEqual(defaultState);
    });

    it('parses lookback from url', () => {
      expect(getUrlState(`?lookback=${lookback}`)).toEqual({
        lookback,
      });
    });

    it('parses first lookback in url', () => {
      expect(getUrlState(`?lookback=${lookback}&lookback="second unused lookback value"`)).toEqual({
        lookback,
      });
    });

    it('gets service from url', () => {
      expect(getUrlState(`?service=${service}`)).toEqual({
        ...defaultState,
        service,
      });
    });

    it('uses first service in url', () => {
      expect(getUrlState(`?service=${service}&service="second unused service value"`)).toEqual({
        ...defaultState,
        service,
      });
    });
  });
});
