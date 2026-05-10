// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Default TanStack Query client for Jaeger UI. Centralize the cache timing
//  so new query hooks stay consistent.
function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  });
}

const queryClient = createAppQueryClient();

interface IAppQueryClientProviderProps {
  children: React.ReactNode;
}

/** Root provider for TanStack Query; hides {@link QueryClient} from app shell code. */
export function AppQueryClientProvider({ children }: IAppQueryClientProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
