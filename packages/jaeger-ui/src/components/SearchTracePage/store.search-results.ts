// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MOST_RECENT, isValidOrderBy } from '../../model/order-by';
import type { OrderBy } from '../../model/order-by';

const VALID_VIEW_MODES = new Set<string>(['list', 'table']);

export function sanitizeSortBy(value: unknown): OrderBy {
  return isValidOrderBy(value) ? value : MOST_RECENT;
}

function sanitizeViewMode(value: unknown): 'list' | 'table' {
  return typeof value === 'string' && VALID_VIEW_MODES.has(value) ? (value as 'list' | 'table') : 'list';
}

function sanitizeStartTimeDisplay(value: unknown): StartTimeDisplay {
  return value === 'relative' ? 'relative' : 'absolute';
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

type StartTimeDisplay = 'absolute' | 'relative';

type SearchResultsStore = {
  viewMode: 'list' | 'table';
  sortBy: OrderBy;
  startTimeDisplay: StartTimeDisplay;
  setViewMode: (mode: 'list' | 'table', opts?: SetterOpts) => void;
  setSortBy: (sortBy: string, opts?: SetterOpts) => void;
  setStartTimeDisplay: (display: StartTimeDisplay) => void;
};

export const useSearchResultsStore = create<SearchResultsStore>()(
  persist(
    set => ({
      viewMode: 'table',
      sortBy: MOST_RECENT,
      startTimeDisplay: 'absolute' as StartTimeDisplay,
      setViewMode: (mode, opts = {}) => {
        if (opts.persist === false) skipNextWrite();
        set({ viewMode: mode });
      },
      setSortBy: (sortBy, opts = {}) => {
        if (opts.persist === false) skipNextWrite();
        set({ sortBy: sanitizeSortBy(sortBy) });
      },
      setStartTimeDisplay: display => set({ startTimeDisplay: display }),
    }),
    {
      name: 'jaeger.search-results.mode',
      storage,
      version: 2,
      migrate: (persistedState, version) => {
        // version 0: viewMode only; version 1: added sortBy; version 2: added startTimeDisplay
        const p = (persistedState ?? {}) as Record<string, unknown>;
        return {
          viewMode: sanitizeViewMode(p.viewMode),
          sortBy: version >= 1 ? sanitizeSortBy(p.sortBy) : MOST_RECENT,
          startTimeDisplay: sanitizeStartTimeDisplay(p.startTimeDisplay),
        };
      },
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
