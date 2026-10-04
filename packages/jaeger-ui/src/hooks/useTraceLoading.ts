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
const POLL_INTERVAL_MS = 60_000;
const POLL_WINDOW_MS = 5 * 60_000;

// Query objects are shared across hook instances and discarded when their cache entry expires.
const firstFetchedAt = new WeakMap<object, number>();
const uploadedQueries = new WeakSet<object>();

function traceRefetchInterval(query: { state: { data: unknown; dataUpdatedAt: number } }): number | false {
  if (uploadedQueries.has(query) || query.state.data === undefined) {
    return false;
  }

  let startedAt = firstFetchedAt.get(query);
  if (startedAt === undefined) {
    startedAt = query.state.dataUpdatedAt;
    firstFetchedAt.set(query, startedAt);
  }

  return Date.now() - startedAt < POLL_WINDOW_MS ? POLL_INTERVAL_MS : false;
}

// TODO: remove once callers (duck.track.ts, TraceDiff) are migrated off Redux/non-hook paths
export function getCachedTrace(id: string): IOtelTrace | undefined {
  return queryClient.getQueryData<IOtelTrace>(TRACE_QUERY_KEY(id));
}

export function populateTraceCache(trace: IOtelTrace): void {
  const key = TRACE_QUERY_KEY(trace.traceID);
  const query = queryClient.getQueryCache().find({ queryKey: key, exact: true });
  if (query) {
    uploadedQueries.add(query);
  }
  queryClient.setQueryData(key, trace);
  const createdQuery = queryClient.getQueryCache().find({ queryKey: key, exact: true });
  if (createdQuery) {
    uploadedQueries.add(createdQuery);
  }
}

// Jaeger may return a partial trace while spans are still arriving. Poll backend traces for
// five minutes after the first successful load. gcTime controls later cache eviction.
export function useTrace(traceId: string): UseQueryResult<IOtelTrace> {
  return useQuery({
    queryKey: TRACE_QUERY_KEY(traceId),
    queryFn: async () => {
      const response = await JaegerAPI.fetchTrace(traceId);
      const data = transformTraceData(response.data[0]);
      if (!data) {
        throw new Error('Invalid trace data received.');
      }
      const otel = data.asOtelTrace();
      if (otel.traceID !== traceId) {
        queryClient.setQueryData(TRACE_QUERY_KEY(otel.traceID), otel);
      }
      return otel;
    },
    staleTime: Infinity,
    refetchInterval: traceRefetchInterval,
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
        const otel = data.asOtelTrace();
        if (otel.traceID !== id) {
          queryClient.setQueryData(TRACE_QUERY_KEY(otel.traceID), otel);
        }
        return otel;
      },
      staleTime: Infinity,
      refetchInterval: traceRefetchInterval,
    })),
  });

  // useQueries returns a new array reference every render. Key the memo on the stable
  // signals for each result: the data object reference (stable when unchanged), the
  // error reference, and the status string. This avoids rebuilding the Map on renders
  // where no query result actually changed.
  // oxlint-disable-next-line react/exhaustive-deps
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
    // oxlint-disable-next-line react/exhaustive-deps
    [...ids, ...results.map(r => r.status), ...results.map(r => r.data), ...results.map(r => r.error)]
  );
}
