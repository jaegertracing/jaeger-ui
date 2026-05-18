// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { jaegerClient } from '../api/v3/client';
import { IOtelTrace } from '../types/otel';

export function useTrace(traceId: string | null): UseQueryResult<IOtelTrace> {
  return useQuery({
    queryKey: ['trace', traceId],
    queryFn: () => jaegerClient.getTrace(traceId as string),
    enabled: !!traceId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
