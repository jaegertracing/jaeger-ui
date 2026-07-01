// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type StartTimeDisplay = 'absolute' | 'relative';

type SearchResultsStore = {
  viewMode: 'list' | 'table';
  setViewMode: (mode: 'list' | 'table') => void;
  startTimeDisplay: StartTimeDisplay;
  setStartTimeDisplay: (display: StartTimeDisplay) => void;
};

export const useSearchResultsStore = create<SearchResultsStore>()(
  persist(
    set => ({
      viewMode: 'table',
      setViewMode: mode => set({ viewMode: mode }),
      startTimeDisplay: 'absolute',
      setStartTimeDisplay: display => set({ startTimeDisplay: display }),
    }),
    { name: 'jaeger.search-results.mode' }
  )
);
