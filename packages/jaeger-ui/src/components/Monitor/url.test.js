// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ROUTE_PATH, matches, getUrl, getUrlState } from './url';

describe('Monitor/url', () => {
  it('matches', () => {
    expect(matches('/monitor')).toBe(true);
    expect(matches('/monitor?var=123')).toBe(false);
    expect(matches('/bla')).toBe(false);
  });

  it('getUrl', () => {
    expect(getUrl()).toBe(ROUTE_PATH);
  });

  describe('getUrlState', () => {
    it('parses valid service, spanKind and timeframe', () => {
      expect(getUrlState('?service=myservice&spanKind=client&timeframe=3600000')).toEqual({
        service: 'myservice',
        spanKind: 'client',
        timeframe: 3600000,
      });
    });

    it('returns an empty object when no params are present', () => {
      expect(getUrlState('')).toEqual({});
    });

    it('omits an invalid spanKind', () => {
      expect(getUrlState('?spanKind=bogus')).toEqual({});
    });

    it('omits a timeframe that is not a recognized option', () => {
      expect(getUrlState('?timeframe=12345')).toEqual({});
      expect(getUrlState('?timeframe=notanumber')).toEqual({});
    });

    it('omits a timeframe with trailing non-numeric characters', () => {
      expect(getUrlState('?timeframe=3600000junk')).toEqual({});
    });

    it('ignores unrelated params such as uiEmbed', () => {
      expect(getUrlState('?service=myservice&uiEmbed=v0')).toEqual({ service: 'myservice' });
    });

    it('uses the first value when a param is repeated', () => {
      expect(getUrlState('?service=first&service=second')).toEqual({ service: 'first' });
    });
  });
});
