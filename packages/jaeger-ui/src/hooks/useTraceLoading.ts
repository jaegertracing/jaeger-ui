// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useRef } from 'react';
import { useQuery, useQueries, UseQueryResult } from '@tanstack/react-query';
import JaegerAPI from '../api/jaeger';
import { fetchedState } from '../constants';
import transformTraceData from '../model/transform-trace-data';
import { queryClient } from '../query/app-query-client';
import { FetchedTrace } from '../types';
import type { IOtelTrace } from '../types/otel';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 60_000;
const TRACE_QUERY_KEY = (id: string) => ['trace', id] as const;

// TODO: remove once callers (duck.track.ts, TraceDiff) are migrated off Redux/non-hook paths
export function getCachedTrace(id: string): IOtelTrace | undefined {
  return queryClient.getQueryData<IOtelTrace>(TRACE_QUERY_KEY(id));
}

export function populateTraceCache(trace: IOtelTrace): void {
  queryClient.setQueryData(TRACE_QUERY_KEY(trace.traceID), trace);
}

// Polls every 60s for 5 min after first load to catch spans still arriving
// (Jaeger favors availability over consistency).
//
// firstFetchedAt must be stable across renders for the 5-minute window to be
// evaluated correctly. It's computed once per hook instance (lazily, via a
// ref) rather than recomputed on every render: recomputing it inline as part
// of `meta` produces a new meta object every render even though the
// underlying value doesn't change, and that churn was letting one extra
// poll slip through right at the 5-minute boundary. On first render we still
// check the query cache in case another consumer already started polling
// this trace, so a remount doesn't reset the window.
export function useTrace(traceId: string): UseQueryResult<IOtelTrace> {
  const firstFetchedAtRef = useRef<number | undefined>(undefined);
  if (firstFetchedAtRef.current === undefined) {
    firstFetchedAtRef.current =
      (queryClient.getQueryCache().find({ queryKey: TRACE_QUERY_KEY(traceId), exact: true })?.meta
        ?.firstFetchedAt as number | undefined) ?? Date.now();
  }

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
    meta: {
      firstFetchedAt: firstFetchedAtRef.current,
    },
    refetchInterval: query => {
      const firstFetchedAt = query.meta?.firstFetchedAt as number | undefined;
      if (firstFetchedAt === undefined) return false;
      return Date.now() - firstFetchedAt < FIVE_MINUTES_MS ? POLL_INTERVAL_MS : false;
    },
  });
}

// TODO: useTraces returns Map<string, FetchedTrace> (legacy shape) while useTrace returns
// UseQueryResult<IOtelTrace>. Callers (TraceDiff, DDG) still expect FetchedTrace, so align
// both hooks to return UseQueryResult<IOtelTrace> once those callers are migrated.
export function useTraces(ids: string[]): Map<string, FetchedTrace> {
  // One stable firstFetchedAt per trace id, populated lazily the first time
  // each id is seen by this hook instance. See useTrace above for why this
  // needs to be ref-backed rather than recomputed inline every render.
  const firstFetchedAtRef = useRef<Map<string, number>>(new Map());
  ids.forEach(id => {
    if (!firstFetchedAtRef.current.has(id)) {
      const cached = queryClient.getQueryCache().find({ queryKey: TRACE_QUERY_KEY(id), exact: true })?.meta
        ?.firstFetchedAt as number | undefined;
      firstFetchedAtRef.current.set(id, cached ?? Date.now());
    }
  });

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
      meta: {
        firstFetchedAt: firstFetchedAtRef.current.get(id),
      },
      refetchInterval: (query: { meta?: { firstFetchedAt?: unknown } }) => {
        const firstFetchedAt = query.meta?.firstFetchedAt as number | undefined;
        if (firstFetchedAt === undefined) return false;
        return Date.now() - firstFetchedAt < FIVE_MINUTES_MS ? POLL_INTERVAL_MS : false;
      },
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
