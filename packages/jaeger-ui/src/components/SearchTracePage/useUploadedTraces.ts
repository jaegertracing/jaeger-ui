// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react';
import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { TraceSummary } from '../../types/trace-summary';

const UPLOADED_SUMMARIES_QUERY_KEY = ['uploadedSummaries'] as const;
const UPLOADED_RAW_TRACES_QUERY_KEY = ['uploadedRawTraces'] as const;

type UploadedTraces = {
  uploadedSummaries: TraceSummary[];
  uploadedRawTraces: unknown[];
  handleTracesLoaded: (summaries: TraceSummary[], rawTraces: unknown[]) => void;
};

/**
 * Clears the uploaded traces cache. Call this when a new API search is submitted
 * so that uploads from a prior session are not mixed with new results.
 */
export function clearUploadedTraces(queryClient: QueryClient): void {
  queryClient.setQueryData(UPLOADED_SUMMARIES_QUERY_KEY, []);
  queryClient.setQueryData(UPLOADED_RAW_TRACES_QUERY_KEY, []);
}

/**
 * Manages the singleton cache for file-uploaded traces.
 *
 * Both keys use skipToken (subscribe-only, no fetch) and gcTime: Infinity so the
 * data survives navigation away from the search page and is restored on Back.
 * Clearing is an explicit action driven by SearchForm on submit via clearUploadedTraces().
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
        const existingIDs = new Set(existing.map(s => s.traceID));
        return [...existing, ...summaries.filter(s => !existingIDs.has(s.traceID))];
      });
      queryClient.setQueryData<unknown[]>(UPLOADED_RAW_TRACES_QUERY_KEY, prev => {
        const existing = prev ?? [];
        const traceIDOf = (r: unknown) =>
          r != null && typeof r === 'object' ? String((r as Record<string, unknown>).traceID) : '';
        const existingIDs = new Set(existing.map(traceIDOf));
        return [...existing, ...rawTraces.filter(r => !existingIDs.has(traceIDOf(r)))];
      });
    },
    [queryClient]
  );

  return { uploadedSummaries, uploadedRawTraces, handleTracesLoaded };
}
