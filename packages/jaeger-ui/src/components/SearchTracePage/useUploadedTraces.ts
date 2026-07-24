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
const UPLOADED_FILE_TRACE_MAP_QUERY_KEY = ['uploadedFileTraceMap'] as const;

/** Maps Ant Design Upload file.uid → trace IDs loaded from that file. */
type UploadedFileTraceMap = Record<string, string[]>;

type UploadedTraces = {
  uploadedSummaries: TraceSummary[];
  uploadedRawTraces: unknown[];
  handleTracesLoaded: (fileUid: string, summaries: TraceSummary[], rawTraces: unknown[]) => void;
  handleUploadedFileRemove: (fileUid: string) => void;
};

function traceIDOf(raw: unknown): string {
  return raw != null && typeof raw === 'object' ? String((raw as Record<string, unknown>).traceID) : '';
}

/** Returns a stable callback that clears all uploaded traces (SearchForm on submit). */
export function useClearUploadedTraces(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.setQueryData(UPLOADED_SUMMARIES_QUERY_KEY, []);
    queryClient.setQueryData(UPLOADED_RAW_TRACES_QUERY_KEY, []);
    queryClient.setQueryData<UploadedFileTraceMap>(UPLOADED_FILE_TRACE_MAP_QUERY_KEY, {});
  }, [queryClient]);
}

/**
 * Manages the singleton cache for file-uploaded traces.
 *
 * Both keys use skipToken (subscribe-only, no fetch) and gcTime: Infinity so the
 * data survives navigation away from the search page and is restored on Back.
 * Clearing is an explicit action via useClearUploadedTraces() on search submit, or
 * handleUploadedFileRemove() when a file row is removed from the Upload tab.
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
    (fileUid: string, summaries: TraceSummary[], rawTraces: unknown[]) => {
      queryClient.setQueryData<UploadedFileTraceMap>(UPLOADED_FILE_TRACE_MAP_QUERY_KEY, prev => ({
        ...prev,
        [fileUid]: summaries.map(s => s.traceID),
      }));

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

  const handleUploadedFileRemove = useCallback(
    (fileUid: string) => {
      const map = queryClient.getQueryData<UploadedFileTraceMap>(UPLOADED_FILE_TRACE_MAP_QUERY_KEY) ?? {};
      const removedTraceIds = map[fileUid];
      if (removedTraceIds == null) {
        return;
      }

      const { [fileUid]: _removed, ...remainingMap } = map;
      const stillReferenced = new Set(Object.values(remainingMap).flat());
      const traceIdsToRemove = new Set(removedTraceIds.filter(id => !stillReferenced.has(id)));

      queryClient.setQueryData<UploadedFileTraceMap>(UPLOADED_FILE_TRACE_MAP_QUERY_KEY, remainingMap);

      if (traceIdsToRemove.size === 0) {
        return;
      }

      queryClient.setQueryData<TraceSummary[]>(UPLOADED_SUMMARIES_QUERY_KEY, prev =>
        (prev ?? []).filter(s => !traceIdsToRemove.has(s.traceID))
      );
      queryClient.setQueryData<unknown[]>(UPLOADED_RAW_TRACES_QUERY_KEY, prev =>
        (prev ?? []).filter(r => !traceIdsToRemove.has(traceIDOf(r)))
      );
    },
    [queryClient]
  );

  return { uploadedSummaries, uploadedRawTraces, handleTracesLoaded, handleUploadedFileRemove };
}
