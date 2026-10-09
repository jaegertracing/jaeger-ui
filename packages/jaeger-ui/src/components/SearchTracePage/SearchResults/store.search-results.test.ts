// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';
import { useSearchResultsStore } from './store.search-results';
import {
  MOST_RECENT,
  LONGEST_FIRST,
  SHORTEST_FIRST,
  MOST_SPANS,
  LEAST_SPANS,
  OLDEST_FIRST,
  TRACE_NAME_ASC,
  TRACE_NAME_DESC,
  MOST_ERRORS,
  LEAST_ERRORS,
} from './order-by';
import type { OrderBy } from './order-by';

const STORAGE_KEY = 'jaeger.search-results.mode';

describe('useSearchResultsStore', () => {
  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);
    useSearchResultsStore.getState().setViewMode('table');
    useSearchResultsStore.getState().setSortBy(MOST_RECENT);
    await Promise.resolve();
    localStorage.removeItem(STORAGE_KEY);
  });

  describe('sortBy', () => {
    it('defaults to MOST_RECENT', () => {
      expect(useSearchResultsStore.getInitialState().sortBy).toBe(MOST_RECENT);
    });

    it.each([
      MOST_RECENT,
      LONGEST_FIRST,
      SHORTEST_FIRST,
      MOST_SPANS,
      LEAST_SPANS,
      OLDEST_FIRST,
      TRACE_NAME_ASC,
      TRACE_NAME_DESC,
      MOST_ERRORS,
      LEAST_ERRORS,
    ])('accepts valid sort key %s', key => {
      useSearchResultsStore.getState().setSortBy(key as OrderBy);
      expect(useSearchResultsStore.getState().sortBy).toBe(key);
    });

    it('rejects unknown sort key and falls back to MOST_RECENT', () => {
      useSearchResultsStore.getState().setSortBy(LONGEST_FIRST);
      // setSortBy is typed to OrderBy for well-behaved callers, but still sanitizes
      // at runtime as a safety net - this simulates a value that bypasses the type
      // system (e.g. a future caller, or genuinely corrupted runtime state).
      useSearchResultsStore.getState().setSortBy('INVALID_KEY' as OrderBy);
      expect(useSearchResultsStore.getState().sortBy).toBe(MOST_RECENT);
    });
  });

  describe('viewMode', () => {
    it('defaults to table', () => {
      expect(useSearchResultsStore.getInitialState().viewMode).toBe('table');
    });

    it('switches to list', () => {
      useSearchResultsStore.getState().setViewMode('list');
      expect(useSearchResultsStore.getState().viewMode).toBe('list');
    });

    it('switches back to table', () => {
      useSearchResultsStore.getState().setViewMode('list');
      useSearchResultsStore.getState().setViewMode('table');
      expect(useSearchResultsStore.getState().viewMode).toBe('table');
    });
  });

  describe('storage error handling', () => {
    it('returns null and does not throw when localStorage.getItem throws', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new DOMException('SecurityError');
      });
      await expect(useSearchResultsStore.persist.rehydrate()).resolves.toBeUndefined();
    });

    it('does not throw when localStorage.setItem throws', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new DOMException('SecurityError');
      });
      expect(() => useSearchResultsStore.getState().setSortBy(LONGEST_FIRST)).not.toThrow();
      expect(useSearchResultsStore.getState().sortBy).toBe(LONGEST_FIRST);
    });

    it('does not throw when localStorage.removeItem throws', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
        throw new DOMException('SecurityError');
      });
      expect(() => useSearchResultsStore.persist.clearStorage()).not.toThrow();
    });
  });

  describe('rehydration', () => {
    it('sanitizes invalid sortBy from persisted state on rehydration', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state: { sortBy: 'INVALID_SORT_KEY', viewMode: 'table' }, version: 0 })
      );
      await useSearchResultsStore.persist.rehydrate();
      expect(useSearchResultsStore.getState().sortBy).toBe(MOST_RECENT);
    });

    it('preserves valid sortBy from persisted state on rehydration', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state: { sortBy: LONGEST_FIRST, viewMode: 'table' }, version: 0 })
      );
      await useSearchResultsStore.persist.rehydrate();
      expect(useSearchResultsStore.getState().sortBy).toBe(LONGEST_FIRST);
    });

    it('sanitizes invalid viewMode from persisted state on rehydration, falling back to the store default', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state: { sortBy: MOST_RECENT, viewMode: 'invalid_mode' }, version: 0 })
      );
      await useSearchResultsStore.persist.rehydrate();
      expect(useSearchResultsStore.getState().viewMode).toBe('table');
    });

    it('rehydrates pre-existing viewMode-only state without inventing a sortBy', async () => {
      // 'list' rather than the default 'table', so the assertion below fails if the
      // persisted viewMode is discarded instead of read.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { viewMode: 'list' }, version: 0 }));
      await useSearchResultsStore.persist.rehydrate();
      expect(useSearchResultsStore.getState().viewMode).toBe('list');
      expect(useSearchResultsStore.getState().sortBy).toBe(MOST_RECENT);
    });
  });
});

describe('useSearchResultsStore — startTimeDisplay', () => {
  beforeEach(() => {
    localStorage.clear();
    useSearchResultsStore.setState({ viewMode: 'table', startTimeDisplay: 'absolute' });
  });

  it('defaults startTimeDisplay to absolute', () => {
    expect(useSearchResultsStore.getInitialState().startTimeDisplay).toBe('absolute');
  });

  it('setStartTimeDisplay updates startTimeDisplay', () => {
    useSearchResultsStore.getState().setStartTimeDisplay('relative');
    expect(useSearchResultsStore.getState().startTimeDisplay).toBe('relative');
  });

  it('setStartTimeDisplay persists to localStorage', () => {
    useSearchResultsStore.getState().setStartTimeDisplay('relative');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.state.startTimeDisplay).toBe('relative');
  });

  it('persists startTimeDisplay independently of viewMode', () => {
    useSearchResultsStore.getState().setViewMode('list');
    useSearchResultsStore.getState().setStartTimeDisplay('relative');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.state.viewMode).toBe('list');
    expect(stored.state.startTimeDisplay).toBe('relative');
  });

  it('sanitizes an invalid startTimeDisplay from persisted state on rehydration', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { startTimeDisplay: 'INVALID_VALUE' }, version: 0 })
    );
    await useSearchResultsStore.persist.rehydrate();
    expect(useSearchResultsStore.getState().startTimeDisplay).toBe('absolute');
  });
});
