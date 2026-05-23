// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import type { TraceSummary } from '../../types/trace-summary';

type UploadedTraces = {
  uploadedSummaries: TraceSummary[];
  uploadedRawTraces: unknown[];
  handleTracesLoaded: (summaries: TraceSummary[], rawTraces: unknown[]) => void;
};

/**
 * Manages the singleton cache for file-uploaded traces.
 *
 * Both keys use skipToken (subscribe-only, no fetch) and gcTime: Infinity so the
 * data survives navigation away from the search page and is restored on Back.
 * gcTime: Infinity is safe here for the same reason as ['traceSummaries']: there
 * is exactly one cache entry per key, not one per upload.
 *
 * When searchQueryKey changes to a new non-null value (i.e. the user submits a new
 * API search), both caches are cleared so uploaded results from a prior session are
 * not mixed with the new search context.
 */
export function useUploadedTraces(searchQueryKey: string | null): UploadedTraces {
  const queryClient = useQueryClient();

  const { data: uploadedSummaries = [] } = useQuery<TraceSummary[]>({
    queryKey: ['uploadedSummaries'],
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: uploadedRawTraces = [] } = useQuery<unknown[]>({
    queryKey: ['uploadedRawTraces'],
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Clear uploaded results when the API search changes. Do NOT clear when
  // searchQueryKey becomes null (e.g. Back from a trace with no active search)
  // — that would wipe upload-only results on the homepage.
  const prevKeyRef = useRef(searchQueryKey);
  useEffect(() => {
    const prev = prevKeyRef.current;
    prevKeyRef.current = searchQueryKey;
    if (searchQueryKey !== null && prev !== searchQueryKey) {
      queryClient.setQueryData(['uploadedSummaries'], []);
      queryClient.setQueryData(['uploadedRawTraces'], []);
    }
  });

  const handleTracesLoaded = useCallback(
    (summaries: TraceSummary[], rawTraces: unknown[]) => {
      queryClient.setQueryData<TraceSummary[]>(['uploadedSummaries'], prev => [
        ...(prev ?? []),
        ...summaries,
      ]);
      queryClient.setQueryData<unknown[]>(['uploadedRawTraces'], prev => [...(prev ?? []), ...rawTraces]);
    },
    [queryClient]
  );

  return { uploadedSummaries, uploadedRawTraces, handleTracesLoaded };
}
