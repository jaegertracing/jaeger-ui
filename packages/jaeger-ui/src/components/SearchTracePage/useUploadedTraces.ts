// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import type { TraceSummary } from '../../types/trace-summary';

const UPLOADED_SUMMARIES_QUERY_KEY = ['uploadedSummaries'] as const;
const UPLOADED_RAW_TRACES_QUERY_KEY = ['uploadedRawTraces'] as const;
// Tracks which searchQueryKey the current uploads belong to so stale uploads
// from a prior search are cleared when the user navigates directly to a new search.
const UPLOADED_SEARCH_KEY_QUERY_KEY = ['uploadedSearchKey'] as const;

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
 * gcTime: Infinity is safe here for the same reason as the trace summaries cache: there
 * is exactly one cache entry per key, not one per upload.
 *
 * When searchQueryKey changes to a new non-null value (i.e. the user submits a new
 * API search), both caches are cleared so uploaded results from a prior session are
 * not mixed with the new search context.
 */
export function useUploadedTraces(searchQueryKey: string | null): UploadedTraces {
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

  const { data: storedSearchKey = null } = useQuery<string | null>({
    queryKey: UPLOADED_SEARCH_KEY_QUERY_KEY,
    queryFn: skipToken,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Clear uploaded results when the search key changes. On mount, also clear when the
  // stored key differs from the current key — this handles the case where the user
  // navigates directly to a new search URL (bypassing Back) while uploads from a prior
  // search are still cached. Do NOT clear when searchQueryKey is null (e.g. navigating
  // to the homepage) — that would wipe upload-only results.
  const isMountRef = useRef(true);
  useEffect(() => {
    const isMount = isMountRef.current;
    isMountRef.current = false;

    if (searchQueryKey === null) return;
    if (isMount && storedSearchKey === searchQueryKey) return;

    queryClient.setQueryData(UPLOADED_SUMMARIES_QUERY_KEY, []);
    queryClient.setQueryData(UPLOADED_RAW_TRACES_QUERY_KEY, []);
    queryClient.setQueryData(UPLOADED_SEARCH_KEY_QUERY_KEY, searchQueryKey);
  }, [searchQueryKey, storedSearchKey, queryClient]);

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
      queryClient.setQueryData(UPLOADED_SEARCH_KEY_QUERY_KEY, searchQueryKey);
    },
    [queryClient, searchQueryKey]
  );

  return { uploadedSummaries, uploadedRawTraces, handleTracesLoaded };
}
