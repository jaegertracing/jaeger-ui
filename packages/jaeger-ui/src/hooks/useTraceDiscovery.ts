// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, useIsFetching, skipToken, UseQueryResult } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { jaegerClient } from '../api/v3/client';
import { localeStringComparator } from '../utils/sort';
import type { SearchQuery } from '../types/search';
import type { TraceSummary } from '../types/trace-summary';

/**
 * React Query hook to fetch the list of services from the Jaeger API.
 * @returns Query result with services array
 */
export function useServices(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => jaegerClient.fetchServices(),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    select: data => [...data].sort(localeStringComparator),
  });
}

// Private singleton key. All callers interact through the exported functions below
// rather than referencing the key directly, so it can be changed in one place.
const TRACE_SUMMARIES_QUERY_KEY = ['traceSummaries'] as const;

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
 * New searches are triggered by calling `invalidateTraceSummaries(queryClient)`
 * when the URL search parameters change. This marks the single entry stale and causes
 * React Query to call the current `queryFn` (which closes over the latest `query`
 * argument) to fetch fresh results.
 *
 * staleTime: Infinity — data is never considered stale on its own; staleness is driven
 * entirely by the explicit invalidation on submit, not by elapsed time.
 *
 * gcTime: Infinity — justified here (unlike the parameterized-key case) because there is
 * exactly one cache entry, not one per search. Keeping it alive indefinitely ensures the
 * Back button restores results after any amount of time spent on the trace page.
 */
export function useSearchTraces(query: SearchQuery | null): UseQueryResult<TraceSummary[]> {
  return useQuery({
    queryKey: TRACE_SUMMARIES_QUERY_KEY,
    queryFn: query ? () => jaegerClient.fetchTraceSummaries(query) : skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/** Invalidate the trace summaries cache, triggering a background refetch. */
export function invalidateTraceSummaries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: TRACE_SUMMARIES_QUERY_KEY });
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
    queryKey: ['spanNames', service],
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
