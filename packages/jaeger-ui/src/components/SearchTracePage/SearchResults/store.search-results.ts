// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

// getItem/setItem/removeItem guard against non-browser environments (SSR / Node)
// and swallow storage errors (SecurityError / QuotaExceededError), matching the
// pattern in search-panel-store.ts.
const storage = createJSONStorage(() => ({
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch {
      // Ignore SecurityError or QuotaExceededError
    }
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore SecurityError
    }
  },
}));

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
      name: 'jaeger.search-results.mode',
      storage,
      version: 2,
      // merge (below) already sanitizes all three fields on every rehydration path,
      // including a version mismatch, so this only needs to pass the persisted blob
      // through - it can't be omitted outright because zustand discards
      // version-mismatched state entirely when no migrate function is provided.
      migrate: persistedState => persistedState as SearchResultsStore,
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
