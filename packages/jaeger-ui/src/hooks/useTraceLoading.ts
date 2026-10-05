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
const UPLOADED_TRACE_QUERY_KEY = (id: string) => ['uploaded-trace', id] as const;
export type TraceSource = 'backend' | 'upload';

// TODO: remove once callers (duck.track.ts, TraceDiff) are migrated off Redux/non-hook paths
export function getCachedTrace(id: string, source: TraceSource = 'backend'): IOtelTrace | undefined {
  if (source === 'upload') {
    return queryClient.getQueryData<IOtelTrace>(UPLOADED_TRACE_QUERY_KEY(id));
  }
  return (
    queryClient.getQueryData<IOtelTrace>(TRACE_QUERY_KEY(id)) ??
    queryClient.getQueryData<IOtelTrace>(UPLOADED_TRACE_QUERY_KEY(id))
  );
}

export function populateTraceCache(trace: IOtelTrace): void {
  queryClient.setQueryData(UPLOADED_TRACE_QUERY_KEY(trace.traceID), trace);
}

// Jaeger may return a partial trace. The user can reload it from the Incomplete warning;
// replacing trace data automatically would disrupt the current trace view.
export function reloadBackendTrace(traceId: string): Promise<void> {
  return queryClient.resetQueries({
    predicate: query =>
      query.queryKey[0] === 'trace' &&
      (query.queryKey[1] === traceId || (query.state.data as IOtelTrace | undefined)?.traceID === traceId),
  });
}

export function useTrace(traceId: string, source: TraceSource = 'backend'): UseQueryResult<IOtelTrace> {
  return useQuery({
    queryKey: source === 'upload' ? UPLOADED_TRACE_QUERY_KEY(traceId) : TRACE_QUERY_KEY(traceId),
    queryFn: async () => {
      if (source === 'upload') {
        throw new Error('This uploaded trace is no longer available. Upload the file again.');
      }
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
    ...(source === 'upload' ? { retry: false } : {}),
  });
}

// TODO: useTraces returns Map<string, FetchedTrace> (legacy shape) while useTrace returns
// UseQueryResult<IOtelTrace>. Callers (TraceDiff, DDG) still expect FetchedTrace, so align
// both hooks to return UseQueryResult<IOtelTrace> once those callers are migrated.
export function useTraces(
  ids: string[],
  sources?: ReadonlyMap<string, TraceSource>
): Map<string, FetchedTrace> {
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: sources?.get(id) === 'upload' ? UPLOADED_TRACE_QUERY_KEY(id) : TRACE_QUERY_KEY(id),
      queryFn: async () => {
        if (sources?.get(id) === 'upload') {
          throw new Error('This uploaded trace is no longer available. Upload the file again.');
        }
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
      ...(sources?.get(id) === 'upload' ? { retry: false } : {}),
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
