// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS } from '../../model/order-by';

const VALID_SORT_KEYS = new Set([MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS]);
const VALID_VIEW_MODES = new Set<string>(['list', 'table']);

export type SortKey =
  | typeof MOST_RECENT
  | typeof LONGEST_FIRST
  | typeof SHORTEST_FIRST
  | typeof MOST_SPANS
  | typeof LEAST_SPANS;

export function sanitizeSortBy(value: unknown): SortKey {
  return typeof value === 'string' && VALID_SORT_KEYS.has(value) ? (value as SortKey) : MOST_RECENT;
}

function sanitizeViewMode(value: unknown): 'list' | 'table' {
  return typeof value === 'string' && VALID_VIEW_MODES.has(value) ? (value as 'list' | 'table') : 'list';
}

// ADR-0010 PR 2: setters accept { persist: false } to update state without
// writing to localStorage — for URL-driven or heuristic overrides that
// should not overwrite the user's saved preference.
// A counter (not a boolean) tracks pending skips so consecutive { persist: false }
// calls each suppress exactly one write without interfering with each other.
// The storage methods guard against non-browser environments (SSR / Node).
function createConditionalStorage() {
  let _skipCount = 0;
  const skip = () => {
    _skipCount++;
  };
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
      if (_skipCount > 0) {
        _skipCount--;
        return;
      }
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
  return { storage, skip };
}

const { storage, skip: skipNextWrite } = createConditionalStorage();

type SetterOpts = { persist?: boolean };

type SearchResultsStore = {
  viewMode: 'list' | 'table';
  sortBy: SortKey;
  setViewMode: (mode: 'list' | 'table', opts?: SetterOpts) => void;
  setSortBy: (sortBy: string, opts?: SetterOpts) => void;
};

export const useSearchResultsStore = create<SearchResultsStore>()(
  persist(
    set => ({
      viewMode: 'list',
      sortBy: MOST_RECENT,
      setViewMode: (mode, opts = {}) => {
        if (opts.persist === false) skipNextWrite();
        set({ viewMode: mode });
      },
      setSortBy: (sortBy, opts = {}) => {
        if (opts.persist === false) skipNextWrite();
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
