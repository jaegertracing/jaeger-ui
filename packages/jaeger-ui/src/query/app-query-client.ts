// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { QueryClient } from '@tanstack/react-query';

// Default TanStack Query client for Jaeger UI. Centralize the cache timing
//  so new query hooks stay consistent.
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  });
}

/** Singleton used by the root {@link QueryClientProvider}. */
export const appQueryClient = createAppQueryClient();
