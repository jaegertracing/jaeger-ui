// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { jaegerClient } from '../api/v3/client';
import { localeStringComparator } from '../utils/sort';

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
  });
}

/**
 * React Query hook to fetch the list of span names (operations) for a given service.
 * @param service - The service name
 * @returns Query result with span names array
 */
export function useSpanNames(service: string | null): UseQueryResult<{ name: string; spanKind: string }[]> {
  return useQuery({
    queryKey: ['spanNames', service],
    queryFn: () => jaegerClient.fetchSpanNames(service!),
    enabled: !!service, // Only fetch when service is selected
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

/**
 * React Query hook to fetch the list of server-side operations for a given service.
 * @param service - The service name
 * @returns Query result with server operation names array
 */
export function useServerOps(service: string | null): UseQueryResult<string[]> {
  return useQuery({
    queryKey: ['serverOps', service],
    queryFn: async () => {
      const ops = await jaegerClient.fetchSpanNames(service!);
      return ops
        .filter(op => op.spanKind === 'server')
        .map(op => op.name)
        .sort(localeStringComparator);
    },
    enabled: !!service, // Only fetch when service is selected
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}
