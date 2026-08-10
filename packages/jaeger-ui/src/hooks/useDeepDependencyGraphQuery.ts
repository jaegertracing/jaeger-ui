// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import JaegerAPI from '../api/jaeger';
import transformDdgData from '../model/ddg/transformDdgData';
import type { TDdgModel, TDdgModelParams, TDdgPayload } from '../model/ddg/types';
import type { ApiError } from '../types/api-error';

function deepDependencyGraphQueryKey(
  params: TDdgModelParams
): readonly ['ddg', string, string, number, number] {
  const { service, operation = '*', start, end } = params;
  return ['ddg', service, operation, start, end] as const;
}

function normalizeDdgPayload(response: unknown): TDdgPayload {
  if (response && typeof response === 'object' && 'dependencies' in response) {
    return response as TDdgPayload;
  }
  return { dependencies: [] };
}

/**
 * React Query hook for the Deep Dependencies graph (`GET /api/v1/dependencies` analytics API).
 * Returns a transformed `TDdgModel` for the focal service/operation and time window.
 */
export function useDeepDependencyGraphQuery(
  params: TDdgModelParams | null | undefined
): UseQueryResult<TDdgModel, ApiError> {
  return useQuery({
    queryKey: params ? deepDependencyGraphQueryKey(params) : (['ddg', 'disabled'] as const),
    queryFn: async () => {
      const { service, operation, start, end } = params!;
      const response = await JaegerAPI.fetchDeepDependencyGraph({
        service,
        operation,
        start,
        end,
      });
      const payload = normalizeDdgPayload(response);
      return transformDdgData(payload, { service, operation });
    },
    enabled: Boolean(params?.service),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useDeepDependencyGraphQueryFromUrl(
  service: string | undefined,
  operation: string | undefined,
  start = 0,
  end = 0
): UseQueryResult<TDdgModel, ApiError> {
  const params: TDdgModelParams | null = service ? { service, operation, start, end } : null;
  return useDeepDependencyGraphQuery(params);
}
