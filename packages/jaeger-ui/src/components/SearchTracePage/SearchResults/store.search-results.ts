// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import storage from '../../../utils/storage';
import { MOST_RECENT, isValidOrderBy } from './order-by';
import type { OrderBy } from './order-by';

const VALID_VIEW_MODES = new Set<string>(['list', 'table']);

function sanitizeSortBy(value: unknown): OrderBy {
  return isValidOrderBy(value) ? value : MOST_RECENT;
}

function sanitizeViewMode(value: unknown): 'list' | 'table' {
  return typeof value === 'string' && VALID_VIEW_MODES.has(value) ? (value as 'list' | 'table') : 'table';
}

type StartTimeDisplay = 'absolute' | 'relative';

function sanitizeStartTimeDisplay(value: unknown): StartTimeDisplay {
  return value === 'relative' ? 'relative' : 'absolute';
}

const jsonStorage = createJSONStorage(() => storage);

type SearchResultsStore = {
  viewMode: 'list' | 'table';
  sortBy: OrderBy;
  startTimeDisplay: StartTimeDisplay;
  setViewMode: (mode: 'list' | 'table') => void;
  setSortBy: (sortBy: OrderBy) => void;
  setStartTimeDisplay: (display: StartTimeDisplay) => void;
};

export const useSearchResultsStore = create<SearchResultsStore>()(
  persist(
    set => ({
      viewMode: 'table',
      sortBy: MOST_RECENT,
      startTimeDisplay: 'absolute',
      setViewMode: mode => set({ viewMode: mode }),
      setSortBy: sortBy => set({ sortBy: sanitizeSortBy(sortBy) }),
      setStartTimeDisplay: display => set({ startTimeDisplay: display }),
    }),
    {
      // The key predates sortBy and startTimeDisplay. Renaming it to match what it now
      // holds would reset the view mode every existing user has already chosen.
      name: 'jaeger.search-results.mode',
      storage: jsonStorage,
      merge: (persisted, current) => {
        const p = persisted as Partial<SearchResultsStore>;
        return {
          ...current,
          viewMode: sanitizeViewMode(p.viewMode),
          sortBy: sanitizeSortBy(p.sortBy),
          startTimeDisplay: sanitizeStartTimeDisplay(p.startTimeDisplay),
        };
      },
      partialize: state => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        startTimeDisplay: state.startTimeDisplay,
      }),
    }
  )
);
