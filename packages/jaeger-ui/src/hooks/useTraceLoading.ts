// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, useQueries, UseQueryResult } from '@tanstack/react-query';
import JaegerAPI from '../api/jaeger';
import { fetchedState } from '../constants';
import transformTraceData from '../model/transform-trace-data';
import { FetchedTrace } from '../types';
import { Trace } from '../types/trace';

export function useTrace(traceId: string): UseQueryResult<Trace> {
  return useQuery({
    queryKey: ['trace', traceId],
    queryFn: async () => {
      const response = await JaegerAPI.fetchTrace(traceId);
      const data = transformTraceData(response.data[0]);
      if (!data) {
        throw new Error('Invalid trace data received.');
      }
      return data;
    },
    staleTime: Infinity,
  });
}

export function useTraces(ids: string[]): Map<string, FetchedTrace> {
  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: ['trace', id],
      queryFn: async () => {
        const response = await JaegerAPI.fetchTrace(id);
        const data = transformTraceData(response.data[0]);
        if (!data) {
          throw new Error('Invalid trace data received.');
        }
        return data;
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
