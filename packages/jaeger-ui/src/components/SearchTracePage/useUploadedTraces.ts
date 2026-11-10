// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react';
import { useQuery, useQueryClient, skipToken } from '@tanstack/react-query';
import type { TraceSummary } from '../../types/trace-summary';
import { queryClient as appQueryClient } from '../../query/app-query-client';
import { uploadedTraceId } from '../../utils/otel-upload';

/**
 * Similar to useSearchTraces() from hooks/useTraceDiscovery.ts,
 * uploaded traces also use a **singleton cache design**.
 */
const UPLOADED_SUMMARIES_QUERY_KEY = ['uploadedSummaries'] as const;
const UPLOADED_RAW_TRACES_QUERY_KEY = ['uploadedRawTraces'] as const;

export function isUploadedTrace(traceID: string): boolean {
  const summaries = appQueryClient.getQueryData<TraceSummary[]>(UPLOADED_SUMMARIES_QUERY_KEY);
  return summaries?.some(summary => summary.traceID === traceID) ?? false;
}

/**
 * FileLoader writes every upload to the ['trace', id] cache, so the last upload of an ID wins
 * there. The registries follow the same rule: a later upload replaces the entry in place.
 * Incoming items without an ID are dropped.
 */
function replaceById<T>(existing: T[], incoming: T[], getId: (item: T) => string | undefined): T[] {
  const latest = new Map<string, T>();
  incoming.forEach(item => {
    const id = getId(item);
    if (id !== undefined) latest.set(id, item);
  });
  const replaced = existing.map(item => {
    const id = getId(item);
    const next = id === undefined ? undefined : latest.get(id);
    if (id === undefined || next === undefined) return item;
    latest.delete(id);
    return next;
  });
  return [...replaced, ...latest.values()];
}

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
      queryClient.setQueryData<TraceSummary[]>(UPLOADED_SUMMARIES_QUERY_KEY, prev =>
        replaceById(prev ?? [], summaries, s => s.traceID)
      );
      queryClient.setQueryData<unknown[]>(UPLOADED_RAW_TRACES_QUERY_KEY, prev =>
        replaceById(prev ?? [], rawTraces, uploadedTraceId)
      );
    },
    [queryClient]
  );

  return { uploadedSummaries, uploadedRawTraces, handleTracesLoaded };
}
