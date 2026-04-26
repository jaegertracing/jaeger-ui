// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getEmbeddedState } from '../utils/embedded-url';
import { resetEmbeddedFromUrlCacheForTests, useEmbeddedState } from './embedded-store';

vi.mock('../utils/embedded-url', () => ({
  getEmbeddedState: vi.fn(),
}));

const mockGetEmbeddedState = vi.mocked(getEmbeddedState);

describe('useEmbeddedState', () => {
  beforeEach(() => {
    resetEmbeddedFromUrlCacheForTests();
    mockGetEmbeddedState.mockReset();
  });

  it('returns the same reference when called twice (cached)', () => {
    window.history.replaceState({}, '', '/?uiEmbed=v0');
    resetEmbeddedFromUrlCacheForTests();
    mockGetEmbeddedState.mockReturnValue(null);
    const a = useEmbeddedState();
    const b = useEmbeddedState();
    expect(a).toBe(b);
    expect(mockGetEmbeddedState).toHaveBeenCalledTimes(1);
  });

  it('returns null when window.location.search is empty', () => {
    window.history.replaceState({}, '', '/');
    resetEmbeddedFromUrlCacheForTests();
    expect(useEmbeddedState()).toBeNull();
    expect(mockGetEmbeddedState).not.toHaveBeenCalled();
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
    mockGetEmbeddedState.mockReturnValue(embeddedState);
    window.history.replaceState({}, '', '/?uiEmbed=v0');
    resetEmbeddedFromUrlCacheForTests();
    expect(useEmbeddedState()).toBe(embeddedState);
    expect(mockGetEmbeddedState).toHaveBeenCalledWith('?uiEmbed=v0');
  });

  it('returns null when window is undefined (SSR)', () => {
    resetEmbeddedFromUrlCacheForTests();
    vi.stubGlobal('window', undefined);
    try {
      expect(useEmbeddedState()).toBeNull();
      expect(useEmbeddedState()).toBeNull();
      expect(mockGetEmbeddedState).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      resetEmbeddedFromUrlCacheForTests();
    }
  });
});
