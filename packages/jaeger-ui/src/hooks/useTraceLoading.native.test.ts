// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fetchedState } from '../constants';
import { queryClient } from '../query/app-query-client';
import { getCachedTrace, populateTraceCache, useTrace, useTraces } from './useTraceLoading';
import { parseOtelTrace } from '../api/v3/parser';
import type { IOtelTrace } from '../types/otel';

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

function branchingResponse() {
  const response = structuredClone(payload);
  const spans = response.result.resourceSpans[0].scopeSpans[0].spans;
  for (const childID of ['2222222222222222', '3333333333333333']) {
    const child = { ...spans[0], spanId: childID, parentSpanId: spanID };
    spans.push(child);
  }
  return response;
}

function guardDeepComparison(trace: IOtelTrace) {
  const root = trace.spans[0];
  const children = root.childSpans;
  // Bound recursion so a structural-sharing regression fails instead of hanging the test runner.
  const readChildren = vi.fn(() => {
    if (readChildren.mock.calls.length > 200) throw new Error('Recursive trace comparison');
    return children;
  });
  Object.defineProperty(root, 'childSpans', { get: readChildren, enumerable: true, configurable: true });
  return readChildren;
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

  it('replaces an unobserved canonical branching trace when an alias loads', async () => {
    const response = branchingResponse();
    const oldTrace = parseOtelTrace(response.result)!;
    populateTraceCache(oldTrace);
    const readChildren = guardDeepComparison(oldTrace);
    respond(response);
    const { result } = renderHook(() => useResult(aliasID), { wrapper });
    await waitFor(() => expect(result.current.done).toBe(true));
    const fresh = result.current.data!;
    expect(getCachedTrace(traceID)).toBe(fresh);
    expect(getCachedTrace(aliasID)).toBe(fresh);
    expect(readChildren).not.toHaveBeenCalled();
    expect(fresh.spans[0].childSpans).toHaveLength(2);
    expect(fresh.spans[0].childSpans[0].parentSpan).toBe(fresh.spans[0]);
  });

  it('refetches a cached branching trace without comparing its cyclic graph', async () => {
    const response = branchingResponse();
    respond(response);
    const { result } = renderHook(() => useResult(traceID), { wrapper });
    await waitFor(() => expect(result.current.done).toBe(true));
    const oldTrace = result.current.data!;
    const readChildren = guardDeepComparison(oldTrace);
    respond(response);
    await queryClient.invalidateQueries({ queryKey: ['trace', traceID], exact: true });
    await waitFor(() => {
      expect(result.current.done).toBe(true);
      expect(result.current.data).not.toBe(oldTrace);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readChildren).not.toHaveBeenCalled();
    expect(result.current.data?.spans[0].childSpans[0].parentSpan).toBe(result.current.data?.spans[0]);
  });

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

  it.each([
    ['1', '00000000000000000000000000000001'],
    ['a1b2', '0000000000000000000000000000a1b2'],
    ['abcdefabcdef', '00000000000000000000abcdefabcdef'],
    ['abcdefabcdef0', '0000000000000000000abcdefabcdef0'],
    ['abcdefabcdef01', '000000000000000000abcdefabcdef01'],
    ['abcdefabcdef012', '00000000000000000abcdefabcdef012'],
    ['a1b2c3d4e5f67890', '0000000000000000a1b2c3d4e5f67890'],
    ['s23gbclyqrBxrBGcUEygfA==', 'b36de06dc972aab071ac119c504ca07c'],
    ['s23gbclyqrBxrBGcUEygfA', 'b36de06dc972aab071ac119c504ca07c'],
    ['s23gbclyqrBxrBGc-Eyg_A==', 'b36de06dc972aab071ac119cf84ca0fc'],
    ['obLD1OX2eJA=', '0000000000000000a1b2c3d4e5f67890'],
  ])('loads supported ID alias %s and caches both IDs', async (alias, canonical) => {
    const response = structuredClone(payload);
    response.result.resourceSpans[0].scopeSpans[0].spans[0].traceId = canonical;
    respond(response);
    const first = renderHook(() => useResult(alias), { wrapper });
    await waitFor(() => expect(first.result.current.done).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(`/api/v3/traces/${canonical}`, {
      signal: expect.any(AbortSignal),
    });
    const trace = first.result.current.data;
    expect(trace?.traceID).toBe(canonical);
    expect(getCachedTrace(alias)).toBe(trace);
    expect(getCachedTrace(canonical)).toBe(trace);
    first.unmount();
    const second = renderHook(() => useResult(canonical), { wrapper });
    expect(second.result.current.data).toBe(trace);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    'bad-id',
    '0',
    'AAAAAAAAAAA=',
    'AAAAAAAAAAAAAAAAAAAAAA==',
    'AQIDBAUGBwgJCgsMDQ4PEBE=',
    ...Array.from({ length: 7 }, (_, i) => btoa('g'.repeat(i + 9))),
  ])('rejects invalid or reserved ID %s before fetching', async id => {
    const { result } = renderHook(() => useResult(id), { wrapper });
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.error).toMatchObject({ name: 'ZodError' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getCachedTrace(id)).toBeUndefined();
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

it('replaces uploaded branching traces without comparing their cyclic graphs', () => {
  const response = branchingResponse();
  const oldTrace = parseOtelTrace(response.result)!;
  const fresh = parseOtelTrace(response.result)!;
  populateTraceCache(oldTrace);
  const readChildren = guardDeepComparison(oldTrace);
  populateTraceCache(fresh);
  expect(getCachedTrace(traceID)).toBe(fresh);
  expect(readChildren).not.toHaveBeenCalled();
  expect(fresh.spans[0].childSpans[0].parentSpan).toBe(fresh.spans[0]);
});
