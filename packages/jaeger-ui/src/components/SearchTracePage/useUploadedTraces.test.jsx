// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useClearUploadedTraces, useUploadedTraces } from './useUploadedTraces';

const summaryA = { traceID: 'trace-a', traceName: 'svc: a' };
const summaryB = { traceID: 'trace-b', traceName: 'svc: b' };
const rawA = { traceID: 'trace-a' };
const rawB = { traceID: 'trace-b' };

function createWrapper(queryClient) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUploadedTraces', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('records file uid → trace IDs and merges summaries on handleTracesLoaded', () => {
    const { result } = renderHook(() => useUploadedTraces(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.handleTracesLoaded('uid-a', [summaryA], [rawA]);
    });

    expect(queryClient.getQueryData(['uploadedSummaries'])).toEqual([summaryA]);
    expect(queryClient.getQueryData(['uploadedRawTraces'])).toEqual([rawA]);
    expect(queryClient.getQueryData(['uploadedFileTraceMap'])).toEqual({ 'uid-a': ['trace-a'] });
  });

  it('handleUploadedFileRemove clears only traces from the removed file', () => {
    const { result } = renderHook(() => useUploadedTraces(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.handleTracesLoaded('uid-a', [summaryA], [rawA]);
      result.current.handleTracesLoaded('uid-b', [summaryB], [rawB]);
    });

    act(() => {
      result.current.handleUploadedFileRemove('uid-a');
    });

    expect(queryClient.getQueryData(['uploadedSummaries'])).toEqual([summaryB]);
    expect(queryClient.getQueryData(['uploadedRawTraces'])).toEqual([rawB]);
    expect(queryClient.getQueryData(['uploadedFileTraceMap'])).toEqual({ 'uid-b': ['trace-b'] });
  });

  it('keeps a trace when another uploaded file still references the same trace ID', () => {
    const { result } = renderHook(() => useUploadedTraces(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.handleTracesLoaded('uid-a', [summaryA], [rawA]);
      result.current.handleTracesLoaded('uid-b', [summaryA], [rawA]);
    });

    act(() => {
      result.current.handleUploadedFileRemove('uid-a');
    });

    expect(queryClient.getQueryData(['uploadedSummaries'])).toEqual([summaryA]);
    expect(queryClient.getQueryData(['uploadedRawTraces'])).toEqual([rawA]);
    expect(queryClient.getQueryData(['uploadedFileTraceMap'])).toEqual({ 'uid-b': ['trace-a'] });

    act(() => {
      result.current.handleUploadedFileRemove('uid-b');
    });

    expect(queryClient.getQueryData(['uploadedSummaries'])).toEqual([]);
    expect(queryClient.getQueryData(['uploadedRawTraces'])).toEqual([]);
    expect(queryClient.getQueryData(['uploadedFileTraceMap'])).toEqual({});
  });

  it('useClearUploadedTraces clears summaries, raw traces, and file map', () => {
    const { result: uploadedResult } = renderHook(() => useUploadedTraces(), {
      wrapper: createWrapper(queryClient),
    });
    const { result: clearResult } = renderHook(() => useClearUploadedTraces(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      uploadedResult.current.handleTracesLoaded('uid-a', [summaryA], [rawA]);
    });

    act(() => {
      clearResult.current();
    });

    expect(queryClient.getQueryData(['uploadedSummaries'])).toEqual([]);
    expect(queryClient.getQueryData(['uploadedRawTraces'])).toEqual([]);
    expect(queryClient.getQueryData(['uploadedFileTraceMap'])).toEqual({});
  });
});
