// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS } from '../../model/order-by';

const VALID_SORT_KEYS = new Set([MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS]);

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
      setSortBy: sortBy => set({ sortBy: VALID_SORT_KEYS.has(sortBy) ? sortBy : MOST_RECENT }),
    }),
    {
      name: 'jaeger.search-results.mode',
      merge: (persisted, current) => {
        const p = persisted as Partial<SearchResultsStore>;
        return {
          ...current,
          ...p,
          sortBy: VALID_SORT_KEYS.has(p.sortBy ?? '') ? (p.sortBy as string) : MOST_RECENT,
        };
      },
    }
  )
);
