// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
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

export function populateTraceCache(trace: IOtelTrace): void {
  queryClient.setQueryData(TRACE_QUERY_KEY(trace.traceID), trace);
}

/**
 * Reads traces directly from the React Query cache for the given IDs.
 * Returns a Map in the same FetchedTrace shape as useTraces(), but without
 * going through the fetch lifecycle — no isPending flash, no refetch.
 * IDs not present in cache are omitted from the Map.
 */
export function useCachedTraces(ids: string[]): Map<string, FetchedTrace> {
  return useMemo(() => {
    const map = new Map<string, FetchedTrace>();
    for (const id of ids) {
      const data = getCachedTrace(id);
      if (data) map.set(id, { id, data, state: fetchedState.DONE });
    }
    return map;
  }, [ids]);
}

// TODO: staleTime: Infinity is incorrect — Jaeger returns partial traces if spans are still arriving
// (availability over consistency). Instead, poll every 60s for up to 5 minutes after first load,
// then stop. Use meta.firstFetchedAt (stamped at query creation, not updated on refetch) to track
// elapsed time: refetchInterval: q => Date.now() - (q.meta.firstFetchedAt as number) < 5*60*1000 ? 60_000 : false
// gcTime controls eviction from memory once no component is using the trace.
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

// TODO: useTraces returns Map<string, FetchedTrace> (legacy shape) while useTrace returns
// UseQueryResult<IOtelTrace>. Callers (TraceDiff, DDG) still expect FetchedTrace, so align
// both hooks to return UseQueryResult<IOtelTrace> once those callers are migrated.
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

  // useQueries returns a new array reference every render. Key the memo on the stable
  // signals for each result: the data object reference (stable when unchanged), the
  // error reference, and the status string. This avoids rebuilding the Map on renders
  // where no query result actually changed.
  // eslint-disable-next-line react-x/exhaustive-deps
  return useMemo(
    () =>
      new Map(
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
      ),
    // eslint-disable-next-line react-x/exhaustive-deps
    [...ids, ...results.map(r => r.status), ...results.map(r => r.data), ...results.map(r => r.error)]
  );
}
