// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Central React Query keys for trace discovery hooks in useTraceDiscovery.ts.
 * Import from here (not inline arrays) so cache invalidation and tests stay aligned.
 */

// `/api/v3/services` - global service name list.
export const SERVICES_QUERY_KEY = ['services'] as const;

// `/api/v3/operations` - span names for one service (`service` null disables the query).
export function spanNamesQueryKey(service: string | null): readonly ['spanNames', string | null] {
  return ['spanNames', service] as const;
}

// Singleton cache slot for `/api/v3/trace-summaries` search results (phase 2b).
export const TRACE_SUMMARIES_QUERY_KEY = ['traceSummaries'] as const;
