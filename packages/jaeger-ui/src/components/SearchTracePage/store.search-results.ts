// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS } from '../../model/order-by';

const VALID_SORT_KEYS = new Set([MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS]);
const VALID_VIEW_MODES = new Set<string>(['list', 'table']);

function sanitizeSortBy(value: unknown): string {
  return typeof value === 'string' && VALID_SORT_KEYS.has(value) ? value : MOST_RECENT;
}

function sanitizeViewMode(value: unknown): 'list' | 'table' {
  return typeof value === 'string' && VALID_VIEW_MODES.has(value) ? (value as 'list' | 'table') : 'list';
}

// ADR-0010 PR 2: setters accept { persist: false } to update state without
// writing to localStorage — for URL-driven or heuristic overrides that
// should not overwrite the user's saved preference.
// One-shot flag: cleared by the setter, reset inside setItem after each write.
let _writeEnabled = true;

const storage = createJSONStorage(() => ({
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    if (_writeEnabled) localStorage.setItem(name, value);
    _writeEnabled = true;
  },
  removeItem: (name: string) => localStorage.removeItem(name),
}));

type SetterOpts = { persist?: boolean };

type SearchResultsStore = {
  viewMode: 'list' | 'table';
  sortBy: string;
  setViewMode: (mode: 'list' | 'table', opts?: SetterOpts) => void;
  setSortBy: (sortBy: string, opts?: SetterOpts) => void;
};

export const useSearchResultsStore = create<SearchResultsStore>()(
  persist(
    set => ({
      viewMode: 'list',
      sortBy: MOST_RECENT,
      setViewMode: (mode, opts = {}) => {
        if (opts.persist === false) _writeEnabled = false;
        set({ viewMode: mode });
      },
      setSortBy: (sortBy, opts = {}) => {
        if (opts.persist === false) _writeEnabled = false;
        set({ sortBy: sanitizeSortBy(sortBy) });
      },
    }),
    {
      name: 'jaeger.search-results.mode',
      storage,
      version: 1,
      migrate: (persistedState, version) => {
        // version 0 had only viewMode; version 1 added sortBy
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
      partialize: state => ({ viewMode: state.viewMode, sortBy: state.sortBy }),
    }
  )
);
