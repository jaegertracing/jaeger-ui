// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';
import { jaegerClient } from '../api/v3/client';

/**
 * React Query hook to fetch the list of services from the Jaeger API.
 * @returns Query result with services array
 */
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => jaegerClient.fetchServices(),
    staleTime: Infinity, // Services list changes infrequently
  });
}

/**
 * React Query hook to fetch the list of span names (operations) for a given service.
 * @param service - The service name
 * @returns Query result with span names array
 */
export function useSpanNames(service: string | null) {
  return useQuery({
    queryKey: ['spanNames', service],
    queryFn: () => jaegerClient.fetchSpanNames(service!),
    enabled: !!service, // Only fetch when service is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
