// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { act, renderHook } from '@testing-library/react';

import { useSortBy } from './use-sort-by';
import { useSearchResultsStore } from './store.search-results';
import { LONGEST_FIRST, MOST_RECENT } from './order-by';
import { trackSortByChange } from '../SearchForm.track';

vi.mock('../SearchForm.track', () => ({ trackSortByChange: vi.fn() }));

describe('useSortBy', () => {
  beforeEach(() => {
    localStorage.clear();
    useSearchResultsStore.setState({ sortBy: MOST_RECENT });
    vi.mocked(trackSortByChange).mockClear();
  });

  it('reads the current sort order from the store', () => {
    useSearchResultsStore.setState({ sortBy: LONGEST_FIRST });
    const { result } = renderHook(() => useSortBy());
    expect(result.current.sortBy).toBe(LONGEST_FIRST);
  });

  it('stores the new sort order and reports the change to analytics', () => {
    const { result } = renderHook(() => useSortBy());

    act(() => result.current.handleSortChange(LONGEST_FIRST));

    expect(useSearchResultsStore.getState().sortBy).toBe(LONGEST_FIRST);
    expect(result.current.sortBy).toBe(LONGEST_FIRST);
    expect(trackSortByChange).toHaveBeenCalledWith(LONGEST_FIRST);
  });
});
