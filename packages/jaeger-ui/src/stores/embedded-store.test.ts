// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  getEmbeddedState,
  resetEmbeddedFromUrlCacheForTests,
  stripEmbeddedState,
  useEmbeddedState,
} from './embedded-store';

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

describe('useEmbeddedState', () => {
  beforeEach(() => {
    resetEmbeddedFromUrlCacheForTests();
  });

  it('returns the same reference when called twice (cached)', () => {
    window.history.replaceState({}, '', '/?uiEmbed=v0');
    resetEmbeddedFromUrlCacheForTests();
    const a = useEmbeddedState();
    const b = useEmbeddedState();
    expect(a).toBe(b);
  });

  it('returns null when window.location.search is empty', () => {
    window.history.replaceState({}, '', '/');
    resetEmbeddedFromUrlCacheForTests();
    expect(useEmbeddedState()).toBeNull();
  });

  it('parses search via getEmbeddedState when search is non-empty', () => {
    const embeddedState = {
      version: 'v0' as const,
      searchHideGraph: false,
      timeline: {
        collapseTitle: false,
        hideMinimap: false,
        hideSummary: false,
      },
    };
    window.history.replaceState({}, '', '/?uiEmbed=v0');
    resetEmbeddedFromUrlCacheForTests();
    const result = useEmbeddedState();
    expect(result).toEqual(embeddedState);
  });

  it('returns null when window is undefined (SSR)', () => {
    resetEmbeddedFromUrlCacheForTests();
    vi.stubGlobal('window', undefined);
    try {
      expect(useEmbeddedState()).toBeNull();
      expect(useEmbeddedState()).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      resetEmbeddedFromUrlCacheForTests();
    }
  });
});
