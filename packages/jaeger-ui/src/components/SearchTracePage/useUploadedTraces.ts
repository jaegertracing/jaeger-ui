// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react';
import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import type { TraceSummary } from '../../types/trace-summary';

/**
 * Similar to useSearchTraces() from hooks/useTraceDiscovery.ts,
 * uploaded traces also use a **singleton cache design**.
 */
// Exported so the trace page can hide its reload action for uploaded traces;
// their data lives in the trace cache under the shared key and a backend
// refetch would drop the only copy.
export const UPLOADED_SUMMARIES_QUERY_KEY = ['uploadedSummaries'] as const;
const UPLOADED_RAW_TRACES_QUERY_KEY = ['uploadedRawTraces'] as const;

type UploadedTraces = {
  uploadedSummaries: TraceSummary[];
  uploadedRawTraces: unknown[];
  handleTracesLoaded: (summaries: TraceSummary[], rawTraces: unknown[]) => void;
};

/** Returns a stable callback that clears the uploaded traces cache. */
export function useClearUploadedTraces(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    // Uploaded traces share the ['trace', id] cache key with backend traces.
    // Evict their cached copies alongside the registry so a later visit
    // refetches instead of showing a guard-less upload.
    const summaries = queryClient.getQueryData<TraceSummary[]>(UPLOADED_SUMMARIES_QUERY_KEY) ?? [];
    summaries.forEach(summary => {
      queryClient.removeQueries({ queryKey: ['trace', summary.traceID], exact: true });
    });
    queryClient.setQueryData(UPLOADED_SUMMARIES_QUERY_KEY, []);
    queryClient.setQueryData(UPLOADED_RAW_TRACES_QUERY_KEY, []);
  }, [queryClient]);
}

/**
 * Manages the singleton cache for file-uploaded traces.
 *
 * Both keys use skipToken (subscribe-only, no fetch) and gcTime: Infinity so the
 * data survives navigation away from the search page and is restored on Back.
 * Clearing is an explicit action driven by SearchForm on submit via useClearUploadedTraces()().
 */
export function useUploadedTraces(): UploadedTraces {
  const queryClient = useQueryClient();

  const { data: uploadedSummaries = [] } = useQuery<TraceSummary[]>({
    queryKey: UPLOADED_SUMMARIES_QUERY_KEY,
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: uploadedRawTraces = [] } = useQuery<unknown[]>({
    queryKey: UPLOADED_RAW_TRACES_QUERY_KEY,
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const handleTracesLoaded = useCallback(
    (summaries: TraceSummary[], rawTraces: unknown[]) => {
      queryClient.setQueryData<TraceSummary[]>(UPLOADED_SUMMARIES_QUERY_KEY, prev => {
        const existing = prev ?? [];
        const seen = new Set(existing.map(s => s.traceID));
        const incoming = summaries.filter(s => {
          if (seen.has(s.traceID)) return false;
          seen.add(s.traceID);
          return true;
        });
        return [...existing, ...incoming];
      });
      queryClient.setQueryData<unknown[]>(UPLOADED_RAW_TRACES_QUERY_KEY, prev => {
        const existing = prev ?? [];
        const traceIDOf = (r: unknown) =>
          r != null && typeof r === 'object' ? String((r as Record<string, unknown>).traceID) : '';
        const seen = new Set(existing.map(traceIDOf));
        const incoming = rawTraces.filter(r => {
          const id = traceIDOf(r);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        return [...existing, ...incoming];
      });
    },
    [queryClient]
  );

  return { uploadedSummaries, uploadedRawTraces, handleTracesLoaded };
}
