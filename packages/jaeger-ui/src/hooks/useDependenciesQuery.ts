// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useRef } from 'react';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import JaegerAPI, { DEFAULT_DEPENDENCY_LOOKBACK } from '../api/jaeger';
import type { ApiError } from '../types/api-error';

export type IServiceDependency = {
  parent: string;
  child: string;
  callCount: number;
};

export type IDependenciesQueryParams = {
  endTs?: number;
  lookback?: number;
};

function dependenciesQueryKey(
  params: IDependenciesQueryParams
): readonly ['dependencies', IDependenciesQueryParams] {
  return ['dependencies', params] as const;
}

function normalizeDependenciesResponse(response: unknown): IServiceDependency[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === 'object' && 'data' in response) {
    const { data } = response as { data: unknown };
    return Array.isArray(data) ? data : [];
  }
  return [];
}

// React Query hook for the service dependency graph (`GET /api/dependencies`).
//Query key is parameterised by `endTs` and `lookback` (defaults match legacy Redux fetch).
export function useDependenciesQuery(
  params: IDependenciesQueryParams = {}
): UseQueryResult<IServiceDependency[], ApiError> {
  const defaultEndTsRef = useRef<number | undefined>(undefined);
  if (defaultEndTsRef.current === undefined && params.endTs === undefined) {
    defaultEndTsRef.current = Date.now();
  }

  const endTs = params.endTs ?? defaultEndTsRef.current!;
  const lookback = params.lookback ?? DEFAULT_DEPENDENCY_LOOKBACK;
  const queryParams = { endTs, lookback };

  return useQuery({
    queryKey: dependenciesQueryKey(queryParams),
    queryFn: async () => {
      const response = await JaegerAPI.fetchDependencies(endTs, lookback);
      return normalizeDependenciesResponse(response);
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
