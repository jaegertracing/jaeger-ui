// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getTracePageLink, getTraceSource, getUrl } from '.';

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

    it('marks an uploaded trace without losing the span filter', () => {
      expect(getUrl(traceID, uiFind, 'upload')).toBe(`/trace/${traceID}?source=upload&uiFind=${uiFind}`);
      expect(getTraceSource('?source=upload&uiFind=foo')).toBe('upload');
      expect(getTraceSource('?uiFind=foo')).toBe('backend');
    });
  });

  describe('getTracePageLink', () => {
    const state = {
      fromSearch: 'some-url',
    };

    it('passes provided state with correct pathname, without uiFind', () => {
      expect(getTracePageLink(traceID, state)).toEqual({
        state,
        pathname: getUrl(traceID),
      });
    });

    it('passes provided state with correct pathname with uiFind', () => {
      expect(getTracePageLink(traceID, state, uiFind)).toEqual({
        state,
        pathname: getUrl(traceID),
        search: `uiFind=${uiFind}`,
      });
    });

    it('keeps the search destination and source choice in an uploaded link', () => {
      expect(getTracePageLink(traceID, state, uiFind, 'upload')).toEqual({
        state,
        pathname: getUrl(traceID),
        search: 'source=upload&uiFind=ui-find',
      });
    });
  });
});
