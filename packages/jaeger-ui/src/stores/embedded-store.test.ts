// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getEmbeddedState } from '../utils/embedded-url';
import { getEmbeddedFromUrl, resetEmbeddedFromUrlCacheForTests } from './embedded-store';

vi.mock('../utils/embedded-url', () => ({
  getEmbeddedState: vi.fn(),
}));

const mockGetEmbeddedState = vi.mocked(getEmbeddedState);

describe('getEmbeddedFromUrl', () => {
  beforeEach(() => {
    resetEmbeddedFromUrlCacheForTests();
    mockGetEmbeddedState.mockReset();
  });

  it('returns the same reference when called twice (cached)', () => {
    window.history.replaceState({}, '', '/?uiEmbed=v0');
    resetEmbeddedFromUrlCacheForTests();
    mockGetEmbeddedState.mockReturnValue(null);
    const a = getEmbeddedFromUrl();
    const b = getEmbeddedFromUrl();
    expect(a).toBe(b);
    expect(mockGetEmbeddedState).toHaveBeenCalledTimes(1);
  });

  it('returns null when window.location.search is empty', () => {
    window.history.replaceState({}, '', '/');
    resetEmbeddedFromUrlCacheForTests();
    expect(getEmbeddedFromUrl()).toBeNull();
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
    expect(getEmbeddedFromUrl()).toBe(embeddedState);
    expect(mockGetEmbeddedState).toHaveBeenCalledWith('?uiEmbed=v0');
  });
});
