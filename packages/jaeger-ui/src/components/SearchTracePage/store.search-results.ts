// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS } from '../../model/order-by';

const VALID_SORT_KEYS = new Set([MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS]);
const VALID_VIEW_MODES = new Set<string>(['list', 'table']);

function sanitizeSortBy(value: unknown): string {
  return typeof value === 'string' && VALID_SORT_KEYS.has(value) ? value : MOST_RECENT;
}

function sanitizeViewMode(value: unknown): 'list' | 'table' {
  return typeof value === 'string' && VALID_VIEW_MODES.has(value) ? (value as 'list' | 'table') : 'list';
}

type SearchResultsStore = {
  viewMode: 'list' | 'table';
  sortBy: string;
  setViewMode: (mode: 'list' | 'table') => void;
  setSortBy: (sortBy: string) => void;
};

export const useSearchResultsStore = create<SearchResultsStore>()(
  persist(
    set => ({
      viewMode: 'list',
      sortBy: MOST_RECENT,
      setViewMode: mode => set({ viewMode: mode }),
      setSortBy: sortBy => set({ sortBy: sanitizeSortBy(sortBy) }),
    }),
    {
      name: 'jaeger.search-results',
      version: 1,
      migrate: (persistedState, version) => {
        // version 0 = jaeger.search-results.mode (viewMode only, no sortBy)
        const p = (persistedState ?? {}) as Record<string, unknown>;
        return {
          viewMode: sanitizeViewMode(p.viewMode),
          sortBy: version >= 1 ? sanitizeSortBy(p.sortBy) : MOST_RECENT,
        };
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<SearchResultsStore>;
        return {
          ...current,
          viewMode: sanitizeViewMode(p.viewMode),
          sortBy: sanitizeSortBy(p.sortBy),
        };
      },
    }
  )
);
