// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SearchResultsStore = {
  viewMode: 'list' | 'table';
  setViewMode: (mode: 'list' | 'table') => void;
};

export const useSearchResultsStore = create<SearchResultsStore>()(
  persist(
    set => ({
      viewMode: 'list',
      setViewMode: mode => set({ viewMode: mode }),
    }),
    { name: 'jaeger.search-results' }
  )
);
