// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, skipToken, UseQueryResult } from '@tanstack/react-query';
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

/**
 * React Query hook to search for traces by query parameters.
 * Calls /api/v3/trace-summaries and returns TraceSummary[].
 * Pass null to suppress the fetch (e.g. on the homepage before the user submits a search).
 */
export function useSearchTraces(query: SearchQuery | null): UseQueryResult<TraceSummary[]> {
  return useQuery({
    queryKey: ['traceSummaries', query],
    queryFn: query ? () => jaegerClient.fetchTraceSummaries(query) : skipToken,
    staleTime: 30 * 1000, // 30 seconds
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
