// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react';
import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import type { TraceSummary } from '../../types/trace-summary';

/**
 * Similar to useSearchTraces() from hooks/useTraceDiscovery.ts,
 * uploaded traces also use a **singleton cache design**.
 */
const UPLOADED_SUMMARIES_QUERY_KEY = ['uploadedSummaries'] as const;
const UPLOADED_RAW_TRACES_QUERY_KEY = ['uploadedRawTraces'] as const;
const UPLOADED_FILE_MAP_QUERY_KEY = ['uploadedTraceFileMap'] as const;

type UploadedTraces = {
  uploadedSummaries: TraceSummary[];
  uploadedRawTraces: unknown[];
  handleTracesLoaded: (summaries: TraceSummary[], rawTraces: unknown[], fileId?: string) => void;
  handleTraceFileRemove: (fileId: string) => void;
};

/** Returns a stable callback that clears the uploaded traces cache. */
export function useClearUploadedTraces(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.setQueryData(UPLOADED_SUMMARIES_QUERY_KEY, []);
    queryClient.setQueryData(UPLOADED_RAW_TRACES_QUERY_KEY, []);
    queryClient.setQueryData(UPLOADED_FILE_MAP_QUERY_KEY, {});
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

  useQuery<Record<string, string[]>>({
    queryKey: UPLOADED_FILE_MAP_QUERY_KEY,
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const handleTracesLoaded = useCallback(
    (summaries: TraceSummary[], rawTraces: unknown[], fileId?: string) => {
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

      if (fileId) {
        queryClient.setQueryData<Record<string, string[]>>(UPLOADED_FILE_MAP_QUERY_KEY, prev => {
          return { ...prev, [fileId]: summaries.map(s => s.traceID) };
        });
      }
    },
    [queryClient]
  );

  const handleTraceFileRemove = useCallback(
    (fileId: string) => {
      const currentMap =
        queryClient.getQueryData<Record<string, string[]>>(UPLOADED_FILE_MAP_QUERY_KEY) ?? {};
      const traceIDsToRemove = currentMap[fileId];
      if (!traceIDsToRemove || traceIDsToRemove.length === 0) return;

      const idsSet = new Set(traceIDsToRemove);

      queryClient.setQueryData<TraceSummary[]>(UPLOADED_SUMMARIES_QUERY_KEY, prev => {
        return (prev ?? []).filter(s => !idsSet.has(s.traceID));
      });

      queryClient.setQueryData<unknown[]>(UPLOADED_RAW_TRACES_QUERY_KEY, prev => {
        const traceIDOf = (r: unknown) =>
          r != null && typeof r === 'object' ? String((r as Record<string, unknown>).traceID) : '';
        return (prev ?? []).filter(r => !idsSet.has(traceIDOf(r)));
      });

      queryClient.setQueryData<Record<string, string[]>>(UPLOADED_FILE_MAP_QUERY_KEY, prev => {
        const newMap = { ...prev };
        delete newMap[fileId];
        return newMap;
      });
    },
    [queryClient]
  );

  return { uploadedSummaries, uploadedRawTraces, handleTracesLoaded, handleTraceFileRemove };
}
