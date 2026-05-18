// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTrace } from './useTrace';
import { jaegerClient } from '../api/v3/client';

vi.mock('../api/v3/client', () => ({
  jaegerClient: {
    getTrace: vi.fn(),
  },
}));

describe('useTrace', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
    return Wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('returns loading state initially when traceId is provided', () => {
    (jaegerClient.getTrace as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    const { result } = renderHook(() => useTrace('trace-abc'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('successfully fetches and returns trace data', async () => {
    const mockTrace = { traceID: 'trace-abc', spans: [] } as any;
    (jaegerClient.getTrace as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrace);

    const { result } = renderHook(() => useTrace('trace-abc'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBe(mockTrace);
    expect(jaegerClient.getTrace).toHaveBeenCalledWith('trace-abc');
    expect(jaegerClient.getTrace).toHaveBeenCalledTimes(1);
  });

  it('uses the correct query key', async () => {
    const mockTrace = { traceID: 'trace-abc', spans: [] } as any;
    (jaegerClient.getTrace as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrace);

    const { result } = renderHook(() => useTrace('trace-abc'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const queries = queryClient.getQueryCache().findAll({ queryKey: ['trace', 'trace-abc'] });
    expect(queries).toHaveLength(1);
  });

  it('is disabled when traceId is null', () => {
    const { result } = renderHook(() => useTrace(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(jaegerClient.getTrace).not.toHaveBeenCalled();
  });

  it('is disabled when traceId is empty string', () => {
    const { result } = renderHook(() => useTrace(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(jaegerClient.getTrace).not.toHaveBeenCalled();
  });

  it('handles errors from getTrace', async () => {
    const mockError = new Error('Failed to fetch trace "bad-trace": 404 Not Found');
    (jaegerClient.getTrace as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

    const { result } = renderHook(() => useTrace('bad-trace'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.data).toBeUndefined();
  });

  it('refetches when traceId changes', async () => {
    const trace1 = { traceID: 'trace-1', spans: [] } as any;
    const trace2 = { traceID: 'trace-2', spans: [] } as any;
    (jaegerClient.getTrace as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(trace1)
      .mockResolvedValueOnce(trace2);

    const { result, rerender } = renderHook(({ id }) => useTrace(id), {
      wrapper: createWrapper(),
      initialProps: { id: 'trace-1' as string | null },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBe(trace1);

    rerender({ id: 'trace-2' });

    await waitFor(() => {
      expect(result.current.data).toBe(trace2);
    });

    expect(jaegerClient.getTrace).toHaveBeenCalledTimes(2);
    expect(jaegerClient.getTrace).toHaveBeenNthCalledWith(1, 'trace-1');
    expect(jaegerClient.getTrace).toHaveBeenNthCalledWith(2, 'trace-2');
  });

  it('stops fetching when traceId becomes null', async () => {
    const mockTrace = { traceID: 'trace-1', spans: [] } as any;
    (jaegerClient.getTrace as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrace);

    const { result, rerender } = renderHook(({ id }) => useTrace(id), {
      wrapper: createWrapper(),
      initialProps: { id: 'trace-1' as string | null },
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    vi.clearAllMocks();
    rerender({ id: null });

    expect(result.current.fetchStatus).toBe('idle');
    expect(jaegerClient.getTrace).not.toHaveBeenCalled();
  });
});
