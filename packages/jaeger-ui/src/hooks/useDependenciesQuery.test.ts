// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import JaegerAPI, { DEFAULT_DEPENDENCY_LOOKBACK } from '../api/jaeger';
import { useDependenciesQuery } from './useDependenciesQuery';

describe('useDependenciesQuery', () => {
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
    vi.spyOn(JaegerAPI, 'fetchDependencies').mockReset();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('fetches dependencies and returns the data array', async () => {
    const deps = [{ parent: 'a', child: 'b', callCount: 1 }];
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: deps });

    const { result } = renderHook(() => useDependenciesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deps);
    expect(JaegerAPI.fetchDependencies).toHaveBeenCalledWith(expect.any(Number), DEFAULT_DEPENDENCY_LOOKBACK);
  });

  it('uses explicit endTs and lookback in the query key', async () => {
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    const params = { endTs: 12345, lookback: 3600000 };
    const { result } = renderHook(() => useDependenciesQuery(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JaegerAPI.fetchDependencies).toHaveBeenCalledWith(12345, 3600000);
  });

  it('returns a raw array response unchanged (no `data` envelope)', async () => {
    const deps = [{ parent: 'svc-a', child: 'svc-b', callCount: 7 }];
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue(deps);

    const { result } = renderHook(() => useDependenciesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deps);
  });

  it('returns [] when response.data is not an array', async () => {
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'unexpected' });

    const { result } = renderHook(() => useDependenciesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('returns [] for an unrecognised response shape (neither array nor `data` envelope)', async () => {
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useDependenciesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
