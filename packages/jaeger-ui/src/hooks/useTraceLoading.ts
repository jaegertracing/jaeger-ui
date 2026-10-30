// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { useQuery, useQueries, UseQueryResult } from '@tanstack/react-query';
import { jaegerClient } from '../api/v3/client';
import { parseOtelTrace } from '../api/v3/parser';
import { fetchedState } from '../constants';
import { queryClient } from '../query/app-query-client';
import { FetchedTrace } from '../types';
import type { IOtelTrace } from '../types/otel';
import { toTraceIdHex } from '../utils/trace-id';

const TRACE_QUERY_KEY = (id: string) => ['trace', id] as const;

// TODO: remove once callers (duck.track.ts, TraceDiff) are migrated off Redux/non-hook paths
export function getCachedTrace(id: string): IOtelTrace | undefined {
  return queryClient.getQueryData<IOtelTrace>(TRACE_QUERY_KEY(id));
}

export function populateTraceCache(trace: IOtelTrace): void {
  queryClient.setQueryData(TRACE_QUERY_KEY(trace.traceID), trace);
}

// Jaeger may return a partial trace. The user can reload it from the Incomplete warning;
// replacing trace data automatically would disrupt the current trace view.
export function reloadBackendTrace(traceId: string): Promise<void> {
  const canonicalId = getCachedTrace(traceId)?.traceID ?? traceId;
  return queryClient.invalidateQueries({
    refetchType: 'active',
    predicate: query =>
      query.queryKey[0] === 'trace' &&
      (query.queryKey[1] === traceId ||
        query.queryKey[1] === canonicalId ||
        (query.state.data as IOtelTrace | undefined)?.traceID === canonicalId),
  });
}

export function useTrace(traceId: string): UseQueryResult<IOtelTrace> {
  return useQuery({
    queryKey: TRACE_QUERY_KEY(traceId),
    queryFn: async ({ signal }) => {
      const response = await jaegerClient.fetchTrace(toTraceIdHex(traceId), signal);
      const otel = parseOtelTrace(response);
      if (!otel) {
        throw new Error('Invalid trace data received.');
      }
      if (otel.traceID !== traceId) {
        queryClient.setQueryData(TRACE_QUERY_KEY(otel.traceID), otel);
      }
      return otel;
    },
    staleTime: Infinity,
    structuralSharing: false,
  });
}

// TODO: useTraces returns Map<string, FetchedTrace> (legacy shape) while useTrace returns
// UseQueryResult<IOtelTrace>. Callers (TraceDiff, DDG) still expect FetchedTrace, so align
// both hooks to return UseQueryResult<IOtelTrace> once those callers are migrated.
export function useTraces(ids: string[]): Map<string, FetchedTrace> {
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: TRACE_QUERY_KEY(id),
      queryFn: async ({ signal }) => {
        const response = await jaegerClient.fetchTrace(toTraceIdHex(id), signal);
        const otel = parseOtelTrace(response);
        if (!otel) {
          throw new Error('Invalid trace data received.');
        }
        if (otel.traceID !== id) {
          queryClient.setQueryData(TRACE_QUERY_KEY(otel.traceID), otel);
        }
        return otel;
      },
      staleTime: Infinity,
      structuralSharing: false,
    })),
  });

  // useQueries returns a new array reference every render. Key the memo on one string
  // built from each id, status and update times, so the Map is rebuilt only when a
  // result changes. The deps array must keep a fixed size: React only compares deps up
  // to the shorter array's length, so deps that grow from [] never trigger a rebuild.
  const resultsKey = ids
    .map((id, i) => `${id}:${results[i]?.status}:${results[i]?.dataUpdatedAt}:${results[i]?.errorUpdatedAt}`)
    .join('|');
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
    [resultsKey]
  );
}
