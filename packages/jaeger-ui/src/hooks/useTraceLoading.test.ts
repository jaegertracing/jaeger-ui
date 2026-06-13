// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

vi.mock('../api/jaeger');

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JaegerAPI from '../api/jaeger';
import { fetchedState } from '../constants';
import traceGenerator from '../demo/trace-generators';
import transformTraceData from '../model/transform-trace-data';
import { getCachedTrace, populateTraceCache, useTrace, useTraces } from './useTraceLoading';
import { queryClient as appQueryClient } from '../query/app-query-client';

const mockFetchTrace = vi.mocked(JaegerAPI.fetchTrace);

// Build a real transformed trace for use in tests
const rawTrace = traceGenerator.trace({});
const legacyTrace = transformTraceData(rawTrace)!;
const otelTrace = legacyTrace.asOtelTrace();

// Each test gets a fresh QueryClient to avoid cross-test cache pollution.
// getCachedTrace/populateTraceCache use the singleton appQueryClient, so we
// reset it in beforeEach instead.
function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  appQueryClient.clear();
  mockFetchTrace.mockReset();
});

describe('getCachedTrace', () => {
  it('returns undefined when nothing is cached', () => {
    expect(getCachedTrace('does-not-exist')).toBeUndefined();
  });

  it('returns the trace after populateTraceCache', () => {
    populateTraceCache(otelTrace);
    expect(getCachedTrace(otelTrace.traceID)).toBe(otelTrace);
  });

  it('finds a trace by a shorter ID that shares the same padded canonical form', () => {
    // 'abc123' and '000abc123' both padStart(32, '0') to the same 32-char key,
    // so a user typing an abbreviated ID resolves to the same cache entry.
    const fixedId = 'abc123';
    const paddedId = `000${fixedId}`;
    const fakeTrace = { ...otelTrace, traceID: fixedId };
    populateTraceCache(fakeTrace);
    expect(getCachedTrace(paddedId)).toBe(fakeTrace);
  });
});

describe('populateTraceCache', () => {
  it('writes the trace into the shared query client', () => {
    populateTraceCache(otelTrace);
    expect(getCachedTrace(otelTrace.traceID)).toBe(otelTrace);
  });

  it('overwrites a previously cached trace with the same ID', () => {
    populateTraceCache(otelTrace);
    const rawTrace2 = traceGenerator.trace({});
    const legacy2 = transformTraceData({ ...rawTrace2, traceID: otelTrace.traceID })!;
    const otelTrace2 = legacy2.asOtelTrace();
    populateTraceCache(otelTrace2);
    expect(getCachedTrace(otelTrace.traceID)).toBe(otelTrace2);
  });
});

describe('useTrace', () => {
  it('returns data after a successful fetch', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchTrace.mockResolvedValue({ data: [rawTrace] } as any);

    const { result } = renderHook(() => useTrace(otelTrace.traceID), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.traceID).toBe(otelTrace.traceID);
  });

  it('returns an error when the API rejects', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchTrace.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useTrace('bad-id'), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns an error when transformTraceData returns null', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchTrace.mockResolvedValue({ data: [null] } as any);

    const { result } = renderHook(() => useTrace('null-trace'), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('serves data from cache without fetching when already populated', async () => {
    // populateTraceCache writes into the singleton appQueryClient.
    // useTrace also uses the same singleton, so pre-populating it means the
    // query is already fresh (staleTime: Infinity in the hook) and no fetch occurs.
    populateTraceCache(otelTrace);

    const client = appQueryClient;
    const { result } = renderHook(() => useTrace(otelTrace.traceID), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchTrace).not.toHaveBeenCalled();
    expect(result.current.data).toBe(otelTrace);
  });
});

describe('useTraces', () => {
  it('returns an empty Map for an empty ids array', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useTraces([]), { wrapper: makeWrapper(client) });
    expect(result.current).toBeInstanceOf(Map);
    expect(result.current.size).toBe(0);
  });

  it('returns LOADING state while fetches are pending', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchTrace.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useTraces([otelTrace.traceID]), {
      wrapper: makeWrapper(client),
    });

    const entry = result.current.get(otelTrace.traceID);
    expect(entry?.state).toBe(fetchedState.LOADING);
  });

  it('returns DONE state with data after successful fetch', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchTrace.mockResolvedValue({ data: [rawTrace] } as any);

    const { result } = renderHook(() => useTraces([otelTrace.traceID]), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => {
      expect(result.current.get(otelTrace.traceID)?.state).toBe(fetchedState.DONE);
    });
    const entry = result.current.get(otelTrace.traceID);
    expect(entry?.data?.traceID).toBe(otelTrace.traceID);
  });

  it('returns ERROR state when fetch fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchTrace.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useTraces(['err-id']), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => {
      expect(result.current.get('err-id')?.state).toBe(fetchedState.ERROR);
    });
    expect(result.current.get('err-id')?.error).toBeInstanceOf(Error);
  });

  it('handles multiple IDs independently', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const rawTrace2 = traceGenerator.trace({});
    mockFetchTrace
      .mockResolvedValueOnce({ data: [rawTrace] } as any)
      .mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useTraces([otelTrace.traceID, rawTrace2.traceID]), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => {
      expect(result.current.get(otelTrace.traceID)?.state).toBe(fetchedState.DONE);
      expect(result.current.get(rawTrace2.traceID)?.state).toBe(fetchedState.ERROR);
    });

    expect(result.current.get(otelTrace.traceID)?.state).toBe(fetchedState.DONE);
    expect(result.current.get(rawTrace2.traceID)?.state).toBe(fetchedState.ERROR);
  });

  it('returns a stable Map reference when query results have not changed', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockFetchTrace.mockResolvedValue({ data: [rawTrace] } as any);

    const { result, rerender } = renderHook(() => useTraces([otelTrace.traceID]), {
      wrapper: makeWrapper(client),
    });

    // Wait until the fetch has settled so the map is stable
    await waitFor(() => {
      expect(result.current.get(otelTrace.traceID)?.state).toBe(fetchedState.DONE);
    });

    const mapBefore = result.current;
    // Force a re-render with no change to query data
    rerender();
    // The Map identity should not change since no query result changed
    expect(result.current).toBe(mapBefore);
  });
});
