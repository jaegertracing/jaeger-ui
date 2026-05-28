// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchResultsStore } from './store.search-results';
import { MOST_RECENT, LONGEST_FIRST, SHORTEST_FIRST, MOST_SPANS, LEAST_SPANS } from '../../model/order-by';

describe('useSearchResultsStore', () => {
  beforeEach(() => {
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
});
