// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useSearchResultsStore } from './store.search-results';
import { MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS } from '../../model/order-by';

const STORAGE_KEY = 'jaeger.search-results.mode';

describe('useSearchResultsStore', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    useSearchResultsStore.setState({ viewMode: 'list', sortBy: MOST_RECENT });
  });

  describe('sortBy', () => {
    it('defaults to MOST_RECENT', () => {
      expect(useSearchResultsStore.getState().sortBy).toBe(MOST_RECENT);
    });

    it.each([MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS])(
      'accepts valid sort key %s',
      key => {
        useSearchResultsStore.getState().setSortBy(key);
        expect(useSearchResultsStore.getState().sortBy).toBe(key);
      }
    );

    it('rejects unknown sort key and falls back to MOST_RECENT', () => {
      useSearchResultsStore.setState({ sortBy: LONGEST_FIRST });
      useSearchResultsStore.getState().setSortBy('INVALID_KEY');
      expect(useSearchResultsStore.getState().sortBy).toBe(MOST_RECENT);
    });
  });

  describe('viewMode', () => {
    it('defaults to list', () => {
      expect(useSearchResultsStore.getState().viewMode).toBe('list');
    });

    it('switches to table', () => {
      useSearchResultsStore.getState().setViewMode('table');
      expect(useSearchResultsStore.getState().viewMode).toBe('table');
    });

    it('switches back to list', () => {
      useSearchResultsStore.setState({ viewMode: 'table' });
      useSearchResultsStore.getState().setViewMode('list');
      expect(useSearchResultsStore.getState().viewMode).toBe('list');
    });
  });

  describe('rehydration', () => {
    it('sanitizes invalid sortBy from persisted state on rehydration', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state: { sortBy: 'INVALID_SORT_KEY', viewMode: 'list' }, version: 1 })
      );
      await useSearchResultsStore.persist.rehydrate();
      expect(useSearchResultsStore.getState().sortBy).toBe(MOST_RECENT);
    });

    it('preserves valid sortBy from persisted state on rehydration', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state: { sortBy: LONGEST_FIRST, viewMode: 'list' }, version: 1 })
      );
      await useSearchResultsStore.persist.rehydrate();
      expect(useSearchResultsStore.getState().sortBy).toBe(LONGEST_FIRST);
    });

    it('sanitizes invalid viewMode from persisted state on rehydration', async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state: { sortBy: MOST_RECENT, viewMode: 'invalid_mode' }, version: 1 })
      );
      await useSearchResultsStore.persist.rehydrate();
      expect(useSearchResultsStore.getState().viewMode).toBe('list');
    });

    it('migrates version 0 state (viewMode-only) without carrying over sortBy', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { viewMode: 'table' }, version: 0 }));
      await useSearchResultsStore.persist.rehydrate();
      expect(useSearchResultsStore.getState().viewMode).toBe('table');
      expect(useSearchResultsStore.getState().sortBy).toBe(MOST_RECENT);
    });
  });
});
