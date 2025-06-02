// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getEmbeddedState, stripEmbeddedState } from './embedded-url.tsx';

describe('getEmbeddedState()', () => {
  it('returns null if uiEmbed is not v0', () => {
    const search = 'uiEmbed=v1&uiSearchHideGraph=1';
    expect(getEmbeddedState(search)).toBeNull();
  });

  it('parses full v0 state correctly', () => {
    const search =
      'uiEmbed=v0&uiSearchHideGraph=1&uiTimelineCollapseTitle=1&uiTimelineHideMinimap=1&uiTimelineHideSummary=1';
    expect(getEmbeddedState(search)).toEqual({
      version: 'v0',
      searchHideGraph: true,
      timeline: {
        collapseTitle: true,
        hideMinimap: true,
        hideSummary: true,
      },
    });
  });

  it('returns false for missing flags', () => {
    const search = 'uiEmbed=v0';
    expect(getEmbeddedState(search)).toEqual({
      version: 'v0',
      searchHideGraph: false,
      timeline: {
        collapseTitle: false,
        hideMinimap: false,
        hideSummary: false,
      },
    });
  });

  it('handles mixed values correctly', () => {
    const search = 'uiEmbed=v0&uiSearchHideGraph=1&uiTimelineHideSummary=1';
    expect(getEmbeddedState(search)).toEqual({
      version: 'v0',
      searchHideGraph: true,
      timeline: {
        collapseTitle: false,
        hideMinimap: false,
        hideSummary: true,
      },
    });
  });
});

describe('stripEmbeddedState()', () => {
  it('removes v0 embedded keys', () => {
    const input = {
      uiEmbed: 'v0',
      uiSearchHideGraph: '1',
      uiTimelineCollapseTitle: '1',
      uiTimelineHideMinimap: '1',
      uiTimelineHideSummary: '1',
      unrelatedKey: 'hello',
    };

    expect(stripEmbeddedState(input)).toEqual({
      unrelatedKey: 'hello',
    });
  });

it('does not strip anything except uiEmbed when version is not v0', () => {
  const input = {
    uiEmbed: 'v1',
    uiSearchHideGraph: '1',
    uiTimelineCollapseTitle: '1',
  };

  expect(stripEmbeddedState(input)).toEqual({
    uiSearchHideGraph: '1',
    uiTimelineCollapseTitle: '1',
  });
});

  it('works when uiEmbed is undefined', () => {
    const input = {
      uiSearchHideGraph: '1',
      uiTimelineHideSummary: '1',
    };

    expect(stripEmbeddedState(input)).toEqual({
      uiSearchHideGraph: '1',
      uiTimelineHideSummary: '1',
    });
  });
});
