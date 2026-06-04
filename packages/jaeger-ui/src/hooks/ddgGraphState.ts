// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { UseQueryResult } from '@tanstack/react-query';
import { fetchedState } from '../constants';
import type { TDdgModel } from '../model/ddg/types';
import type { ApiError } from '../types/api-error';
import type { TDdgStateEntry } from '../types/TDdgState';

// Map a React Query result to the legacy `TDdgStateEntry` shape used by `DeepDependencyGraphPageImpl`.
export function graphStateFromDdgQuery(
  query: Pick<
    UseQueryResult<TDdgModel, ApiError>,
    'data' | 'error' | 'isPending' | 'isLoading' | 'isFetching'
  >
): TDdgStateEntry | undefined {
  const loading = query.isPending || (query.isLoading && !query.data);
  if (loading) {
    return { state: fetchedState.LOADING };
  }
  // Prefer cached data over a stale error (e.g. background refetch failure).
  if (query.data) {
    return { state: fetchedState.DONE, model: query.data };
  }
  if (query.error) {
    return { state: fetchedState.ERROR, error: query.error };
  }
  return undefined;
}
