// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react';
import type { OrderBy } from './order-by';
import { useSearchResultsStore } from './store.search-results';
import { trackSortByChange } from '../SearchForm.track';

/**
 * Reads the persisted sort order and returns a setter for it. Both the Sort dropdown
 * and the table column headers change the sort, so they share one definition of what
 * changing it means: store the new order and report the change to analytics.
 */
export function useSortBy(): { sortBy: OrderBy; handleSortChange: (sortBy: OrderBy) => void } {
  const sortBy = useSearchResultsStore(s => s.sortBy);
  const setSortBy = useSearchResultsStore(s => s.setSortBy);
  const handleSortChange = useCallback(
    (newSortBy: OrderBy) => {
      setSortBy(newSortBy);
      trackSortByChange(newSortBy);
    },
    [setSortBy]
  );
  return { sortBy, handleSortChange };
}
