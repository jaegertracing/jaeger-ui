// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react';
import { useQuery, useIsFetching, useQueryClient, skipToken, UseQueryResult } from '@tanstack/react-query';
import { jaegerClient } from '../api/v3/client';
import { localeStringComparator } from '../utils/sort';
import type { SearchQuery } from '../types/search';
import type { TraceSummary } from '../types/trace-summary';

// Module-private query keys — not exported; other code should use the hooks/accessors below.
const SERVICES_QUERY_KEY = ['services'] as const;
const TRACE_SUMMARIES_QUERY_KEY = ['traceSummaries'] as const;

function spanNamesQueryKey(service: string | null): readonly ['spanNames', string | null] {
  return ['spanNames', service] as const;
}

/**
 * React Query hook to fetch the list of services from the Jaeger API.
 * @returns Query result with services array
 */
export function useServices(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: SERVICES_QUERY_KEY,
    queryFn: () => jaegerClient.fetchServices(),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    select: data => [...data].sort(localeStringComparator),
  });
}

/**
 * React Query hook to search for traces by query parameters.
 * Calls /api/v3/trace-summaries and returns TraceSummary[].
 * Pass null to suppress the fetch (e.g. on the homepage before the user submits a search).
 *
 * **Singleton cache design**: the query key is fixed rather than parameterized by the
 * search arguments. This reflects the actual usage pattern: there is only ever one
 * "current search result" in the application — the user does not navigate between
 * multiple saved searches, and the Back button should restore the same result set,
 * not a different one. A parameterized key would accumulate a separate cache entry for
 * every distinct search submitted during a session, causing unbounded memory growth.
 *
 * **Two-path fetch model**:
 * - Cold start (fresh tab, shared URL): `useSearchTraces` derives the query from the URL
 *   via `searchQueryFromUrl`, finds the cache empty, and fires the `queryFn` directly.
 * - Form submit: `useExecuteSearch` calls `queryClient.fetchQuery()` with the query built
 *   from form state, passing `staleTime: 0` to force a fetch regardless of cache state.
 *   This bypasses the `queryFn` closure here (which still holds the previous query until
 *   the next render). Because the query is passed as an argument at call time, render
 *   timing is irrelevant — the correct query is used regardless of when React processes
 *   the `navigate()` call. `staleTime: 0` only governs the fetch decision;
 *   once the result is written to the cache, this hook's `staleTime: Infinity` takes over
 *   for all subsequent reads.
 *
 * **staleTime: Infinity** — data is never considered stale on its own; staleness is driven
 * entirely by explicit form submission, not elapsed time. This also ensures the URL-sharing
 * case (new tab) does not trigger an unnecessary background refetch after initial load.
 *
 * **gcTime: Infinity** — React Query starts the eviction countdown when the last observer
 * unsubscribes (i.e. SearchTracePage unmounts on navigation). With the default gcTime of
 * 5 minutes, a user spending more than 5 minutes on a trace page would lose the cached
 * results and see a fresh fetch on Back. `gcTime: Infinity` prevents that. Safe here
 * because there is exactly one cache entry — not one per query — so memory growth is bounded.
 * Note: `fetchQuery` is not an observer and does not affect gcTime; the protection relies
 * on this hook being mounted in SearchTracePage whenever the user can navigate Back.
 */
export function useSearchTraces(query: SearchQuery | null): UseQueryResult<TraceSummary[]> {
  return useQuery({
    queryKey: TRACE_SUMMARIES_QUERY_KEY,
    queryFn: query ? () => jaegerClient.fetchTraceSummaries(query) : skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Returns a stable callback that immediately fetches trace summaries for the
 * given query and writes the result into the singleton cache slot.
 *
 * Called from SearchForm.handleSubmit with the query derived directly from form
 * state (not from the URL). This avoids a race condition where invalidateQueries
 * would trigger a refetch via the queryFn closure in useSearchTraces — which still
 * holds the previous query until React processes the navigate() call.
 *
 * staleTime: 0 forces a fetch regardless of what is currently cached. It only
 * affects the fetch decision; once the result is written, useSearchTraces takes
 * over with staleTime: Infinity for all subsequent reads.
 */
export function useExecuteSearch(): (query: SearchQuery) => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(
    async (query: SearchQuery) => {
      await queryClient.fetchQuery({
        queryKey: TRACE_SUMMARIES_QUERY_KEY,
        queryFn: () => jaegerClient.fetchTraceSummaries(query),
        staleTime: 0,
      });
    },
    [queryClient]
  );
}

/** Returns true while a trace summaries fetch is in flight. */
export function useIsSearchFetching(): boolean {
  return useIsFetching({ queryKey: TRACE_SUMMARIES_QUERY_KEY }) > 0;
}

/**
 * React Query hook to fetch the list of span names (operations) for a given service.
 * @param service - The service name
 * @param spanKind - Optional span kind to filter by (e.g. 'server')
 * @returns Query result with array of span name / span kind pairs. Span kinds are lowercase.
 */
export function useSpanNames(
  service: string | null,
  spanKind?: string
): UseQueryResult<{ name: string; spanKind: string }[]> {
  return useQuery({
    queryKey: spanNamesQueryKey(service),
    queryFn: service ? () => jaegerClient.fetchSpanNames(service) : skipToken,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    select: data => {
      let filtered = data;
      if (spanKind) {
        const normalizedKind = spanKind.toLowerCase();
        filtered = data.filter(op => op.spanKind === normalizedKind);
      }
      return [...filtered].sort((a, b) => localeStringComparator(a.name, b.name));
    },
  });
}
