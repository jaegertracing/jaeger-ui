// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, useQueries, UseQueryResult } from '@tanstack/react-query';
import JaegerAPI from '../api/jaeger';
import { fetchedState } from '../constants';
import transformTraceData from '../model/transform-trace-data';
import { queryClient } from '../query/app-query-client';
import { FetchedTrace } from '../types';
import type { IOtelTrace } from '../types/otel';

const TRACE_QUERY_KEY = (id: string) => ['trace', id] as const;

// TODO: remove once callers (duck.track.ts, TraceDiff) are migrated off Redux/non-hook paths
export function getCachedTrace(id: string): IOtelTrace | undefined {
  return (
    queryClient.getQueryData<IOtelTrace>(TRACE_QUERY_KEY(id)) ||
    queryClient.getQueryData<IOtelTrace>(TRACE_QUERY_KEY(id.replace(/^0*/, '')))
  );
}

export function useTrace(traceId: string): UseQueryResult<IOtelTrace> {
  return useQuery({
    queryKey: TRACE_QUERY_KEY(traceId),
    queryFn: async () => {
      const response = await JaegerAPI.fetchTrace(traceId);
      const data = transformTraceData(response.data[0]);
      if (!data) {
        throw new Error('Invalid trace data received.');
      }
      return data.asOtelTrace();
    },
    staleTime: Infinity,
  });
}

export function useTraces(ids: string[]): Map<string, FetchedTrace> {
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: TRACE_QUERY_KEY(id),
      queryFn: async () => {
        const response = await JaegerAPI.fetchTrace(id);
        const data = transformTraceData(response.data[0]);
        if (!data) {
          throw new Error('Invalid trace data received.');
        }
        return data.asOtelTrace();
      },
      staleTime: Infinity,
    })),
  });

  return new Map(
    ids.map((id, i) => {
      const r = results[i];
      if (!r || r.isPending) {
        return [id, { id, state: fetchedState.LOADING }] as [string, FetchedTrace];
      }
      if (r.isError) {
        return [id, { id, state: fetchedState.ERROR, error: r.error as any }] as [string, FetchedTrace];
      }
      if (r.data) {
        return [id, { id, data: r.data, state: fetchedState.DONE }] as [string, FetchedTrace];
      }
      return [id, { id }] as [string, FetchedTrace];
    })
  );
}
