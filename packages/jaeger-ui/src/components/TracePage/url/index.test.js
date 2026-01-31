// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getLocation, getUrl } from '.';

describe('TracePage/url', () => {
  const traceID = 'trace-id';
  const uiFind = 'ui-find';

  describe('getUrl', () => {
    it('includes traceID without uiFind', () => {
      expect(getUrl(traceID)).toBe(`/trace/${traceID}`);
    });

    it('includes traceID and uiFind', () => {
      expect(getUrl(traceID, uiFind)).toBe(`/trace/${traceID}?uiFind=${uiFind}`);
    });
  });

  describe('getLocation', () => {
    const state = {
      from: 'some-url',
    };

    it('passes provided state with correct pathname, without uiFind', () => {
      expect(getLocation(traceID, state)).toEqual({
        state,
        pathname: getUrl(traceID),
      });
    });

    it('passes provided state with correct pathname with uiFind', () => {
      expect(getLocation(traceID, state, uiFind)).toEqual({
        state,
        pathname: getUrl(traceID),
        search: `uiFind=${uiFind}`,
      });
    });
  });
});
