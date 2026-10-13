// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fetchedState } from '../constants';
import { queryClient } from '../query/app-query-client';
import { getCachedTrace, useTrace, useTraces } from './useTraceLoading';

const traceID = 'abcdef0123456789abcdef0123456789';
const aliasID = traceID.toUpperCase();
const spanID = '1111111111111111';
const payload = {
  result: {
    resourceSpans: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'assistant' } }] },
        scopeSpans: [
          {
            spans: [
              {
                traceId: traceID,
                spanId: spanID,
                name: 'chat',
                startTimeUnixNano: '1000000',
                endTimeUnixNano: '2000000',
                attributes: [{ key: 'gen_ai.operation.name', value: { stringValue: 'chat' } }],
              },
            ],
          },
        ],
      },
    ],
  },
};

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const fetchMock = vi.fn<typeof fetch>();
const defaultOptions = queryClient.getDefaultOptions();

beforeEach(() => {
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  queryClient.clear();
  queryClient.setDefaultOptions(defaultOptions);
  vi.unstubAllGlobals();
});

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

function useSingleResult(id: string) {
  const result = useTrace(id);
  return { data: result.data, error: result.error, done: result.isSuccess, failed: result.isError };
}

function useMultipleResult(id: string) {
  const result = useTraces([id]).get(id);
  return {
    data: result?.data,
    error: result?.error,
    done: result?.state === fetchedState.DONE,
    failed: result?.state === fetchedState.ERROR,
  };
}

describe.each(['useTrace', 'useTraces'] as const)('%s native loading', hook => {
  const useResult = hook === 'useTrace' ? useSingleResult : useMultipleResult;

  it('validates and parses the v3 response, preserving GenAI detection', async () => {
    respond(payload);
    const { result } = renderHook(() => useResult(traceID), { wrapper });
    await waitFor(() => expect(result.current.done).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`/api/v3/traces/${traceID}`), {
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data?.traceID).toBe(traceID);
    expect(result.current.data?.spans[0].spanID).toBe(spanID);
    expect(result.current.data?.spans[0].duration).toBe(1000);
    expect(result.current.data?.isGenAITrace).toBe(true);
    expect(result.current.data?.spans[0].genAIKind).toBe('LLM_CALL');
    expect(getCachedTrace(traceID)).toBe(result.current.data);
  });

  it('caches the requested alias and canonical ID and reuses both without fetching', async () => {
    respond(payload);
    const first = renderHook(() => useResult(aliasID), { wrapper });
    await waitFor(() => expect(first.result.current.done).toBe(true));
    const trace = first.result.current.data;
    expect(getCachedTrace(aliasID)).toBe(trace);
    expect(getCachedTrace(traceID)).toBe(trace);
    first.unmount();
    const canonical = renderHook(() => useTrace(traceID), { wrapper });
    const alias = renderHook(() => useTraces([aliasID]), { wrapper });
    expect(canonical.result.current.data).toBe(trace);
    expect(alias.result.current.get(aliasID)?.data).toBe(trace);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps ordinary traces out of the GenAI view', async () => {
    const ordinary = structuredClone(payload);
    ordinary.result.resourceSpans[0].scopeSpans[0].spans[0].attributes = [];
    respond(ordinary);
    const { result } = renderHook(() => useResult(traceID), { wrapper });
    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.data?.isGenAITrace).toBe(false);
    expect(result.current.data?.spans[0].genAIKind).toBeUndefined();
  });

  it.each([{ result: {} }, { result: { resourceSpans: [] } }])('rejects an empty response %j', async body => {
    respond(body);
    const { result } = renderHook(() => useResult(traceID), { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.error).toEqual(new Error('Invalid trace data received.'));
    expect(getCachedTrace(traceID)).toBeUndefined();
  });

  it('rejects malformed OTLP at the client boundary without caching an alias', async () => {
    respond({
      result: { resourceSpans: [{ scopeSpans: [{ spans: [{ traceId: traceID, spanId: 'invalid' }] }] }] },
    });
    const { result } = renderHook(() => useResult(aliasID), { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.error).toMatchObject({ name: 'ZodError' });
    expect(getCachedTrace(aliasID)).toBeUndefined();
    expect(getCachedTrace(traceID)).toBeUndefined();
  });

  it('exposes an HTTP rejection', async () => {
    respond({ error: 'unavailable' }, 503);
    const { result } = renderHook(() => useResult(traceID), { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.error).toEqual(new Error(`Failed to fetch trace ${traceID}: 503 `));
  });

  it('preserves a network rejection', async () => {
    const error = new Error('offline');
    fetchMock.mockRejectedValue(error);
    const { result } = renderHook(() => useResult(traceID), { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
