// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import JaegerAPI, { DEFAULT_DEPENDENCY_LOOKBACK } from '../api/jaeger';
import type { ApiError } from '../types/api-error';

export type IServiceDependency = {
  parent: string;
  child: string;
  callCount: number;
};

export type DataSource = 'Backend' | 'Small Graph' | 'Large Graph';
export const DATA_SOURCES: DataSource[] = ['Backend', 'Small Graph', 'Large Graph'];

type DependenciesQueryParams = {
  endTs?: number;
  lookback?: number;
};

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
// `source` selects between the real backend and the dev-only canned datasets
// shipped under `components/DependencyGraph/sample_data/`. The dev branches
// are guarded by `import.meta.env.DEV` (not a function call) so Vite can
// constant-fold them out of production builds — keeping the sample JSON
// chunks from being shipped to end users.
//
// `endTs` is resolved lazily inside `queryFn` rather than captured at mount
// because the dep-graph page has no user-facing time-window UI: the implicit
// semantic is "show me up to now". On each refetch (incl. window-focus) the
// window should advance with wall-clock time, not stay pinned to the value
// that happened to be current when the component mounted. Contrast with
// `useSearchTraces`, where `endTs` is part of the URL/SearchQuery and
// resolved eagerly — there the user owns the window and results must be
// reproducible from the URL.
export function useDependenciesQuery(
  source: DataSource = 'Backend',
  params: DependenciesQueryParams = {}
): UseQueryResult<IServiceDependency[], ApiError> {
  const lookback = params.lookback ?? DEFAULT_DEPENDENCY_LOOKBACK;
  // When `endTs` is omitted, leave it out of the query key entirely so cache
  // entries are shared across mounts. When an explicit `endTs` is passed, it
  // varies the key as expected.
  const keyEndTs = params.endTs ?? null;

  return useQuery({
    queryKey: ['dependencies', source, keyEndTs, lookback],
    queryFn: async () => {
      if (import.meta.env.DEV && source === 'Small Graph') {
        const mod = await import('../components/DependencyGraph/sample_data/small.json');
        return mod.default as IServiceDependency[];
      }
      if (import.meta.env.DEV && source === 'Large Graph') {
        const mod = await import('../components/DependencyGraph/sample_data/large.json');
        return mod.default as IServiceDependency[];
      }
      const endTs = params.endTs ?? Date.now();
      return normalizeDependenciesResponse(await JaegerAPI.fetchDependencies(endTs, lookback));
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
