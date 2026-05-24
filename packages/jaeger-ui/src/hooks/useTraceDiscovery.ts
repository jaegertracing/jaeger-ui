// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react';
import { useQuery, useIsFetching, useQueryClient, skipToken, UseQueryResult } from '@tanstack/react-query';
import { jaegerClient } from '../api/v3/client';
import { localeStringComparator } from '../utils/sort';
import { isSameQuery } from '../components/SearchTracePage/url';
import type { SearchQuery } from '../types/search';
import type { TraceSummary } from '../types/trace-summary';

const TRACE_SUMMARIES_QUERY_KEY = 'traceSummaries';

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

export type TraceSummariesResult = {
  results: TraceSummary[];
  query: SearchQuery;
};

/**
 * React Query hook to search for traces by query parameters.
 * Calls /api/v3/trace-summaries and returns TraceSummary[].
 * Pass null to suppress the fetch (e.g. on the homepage before the user submits a search).
 *
 * **Keyed cache design**: the query key is `[TRACE_SUMMARIES_QUERY_KEY, query]` so each distinct
 * search gets its own cache entry. This is standard React Query — a new key means a cache
 * miss, so navigating to a new URL triggers a fresh fetch.
 *
 * **Single-slot invariant**: on every render where `query` is non-null, a `useEffect`
 * evicts all cache entries whose key differs from the current query. This keeps at most one
 * live entry in the cache at any time — no unbounded memory growth across a session.
 *
 * **query === null (bare /search)**: the hook finds the most-recently-updated cache entry
 * (by `dataUpdatedAt`), extracts its query as `effectiveQuery`, and subscribes `useQuery`
 * to that key — so the caller sees the cached results and can restore the URL from `data.query`.
 *
 * **staleTime: Infinity** — data is never considered stale on its own; staleness is driven
 * entirely by explicit form submission (navigate to new URL → new key → cache miss).
 *
 * **gcTime: Infinity** — prevents eviction while SearchTracePage is unmounted (e.g. user is
 * on a trace detail page). Safe because the single-slot invariant bounds memory to one entry.
 */
export function useSearchTraces(query: SearchQuery | null): UseQueryResult<TraceSummariesResult> {
  const queryClient = useQueryClient();

  // When query is null (bare /search after TopNav click), find the most recently updated
  // cache entry and subscribe to it so the component can restore the URL from data.query.
  // Read before the eviction effect so we don't race against our own cleanup.
  const effectiveQuery =
    query ??
    (() => {
      const entries = queryClient
        .getQueryCache()
        .findAll({ queryKey: [TRACE_SUMMARIES_QUERY_KEY], exact: false });
      if (entries.length === 0) return null;
      const mostRecent = entries.reduce((latest, current) =>
        current.state.dataUpdatedAt > latest.state.dataUpdatedAt ? current : latest
      );
      return (mostRecent.state.data as TraceSummariesResult | undefined)?.query ?? null;
    })();

  // Keep at most one cache entry: evict entries that don't match the effective query.
  useEffect(() => {
    if (!effectiveQuery) return;
    queryClient
      .getQueryCache()
      .findAll({ queryKey: [TRACE_SUMMARIES_QUERY_KEY], exact: false })
      .forEach(entry => {
        if (!isSameQuery(entry.queryKey[1] as SearchQuery, effectiveQuery)) {
          queryClient.removeQueries({ queryKey: entry.queryKey, exact: true });
        }
      });
  }, [effectiveQuery, queryClient]);

  return useQuery({
    queryKey: [TRACE_SUMMARIES_QUERY_KEY, effectiveQuery],
    queryFn: effectiveQuery
      ? async () =>
          ({
            results: await jaegerClient.fetchTraceSummaries(effectiveQuery),
            query: effectiveQuery,
          }) satisfies TraceSummariesResult
      : skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/** Returns true while a trace summaries fetch is in flight. */
export function useIsSearchFetching(): boolean {
  return useIsFetching({ queryKey: [TRACE_SUMMARIES_QUERY_KEY] }) > 0;
}
