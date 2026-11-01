// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { jaegerClient, DEFAULT_DEPENDENCY_LOOKBACK } from '../api/v3/client';
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
    vi.spyOn(jaegerClient, 'fetchDependencies').mockReset();
  });

  afterEach(() => {
    queryClient?.clear();
    vi.restoreAllMocks();
  });

  it('fetches dependencies and returns the data array for the Backend source', async () => {
    const deps = [{ parent: 'a', child: 'b', callCount: 1 }];
    (jaegerClient.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: deps });

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deps);
    expect(jaegerClient.fetchDependencies).toHaveBeenCalledWith(
      expect.any(Number),
      DEFAULT_DEPENDENCY_LOOKBACK,
      expect.any(AbortSignal)
    );
  });

  it('defaults to the Backend source when called without arguments', async () => {
    const deps = [{ parent: 'a', child: 'b', callCount: 1 }];
    (jaegerClient.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: deps });

    const { result } = renderHook(() => useDependenciesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchDependencies).toHaveBeenCalled();
  });

  it('passes explicit endTs and lookback through to the API call', async () => {
    (jaegerClient.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    const { result } = renderHook(
      () => useDependenciesQuery('Backend', { endTs: 12345, lookback: 3600000 }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchDependencies).toHaveBeenCalledWith(12345, 3600000, expect.any(AbortSignal));
  });

  it('returns a raw array response unchanged (no `data` envelope)', async () => {
    const deps = [{ parent: 'svc-a', child: 'svc-b', callCount: 7 }];
    (jaegerClient.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue(deps);

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deps);
  });

  it('returns [] when response.data is not an array', async () => {
    (jaegerClient.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'unexpected' });

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('returns [] for an unrecognised response shape (neither array nor `data` envelope)', async () => {
    (jaegerClient.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('resolves endTs lazily so refetches advance the time window', async () => {
    (jaegerClient.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1000);

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchDependencies).toHaveBeenNthCalledWith(
      1,
      1000,
      DEFAULT_DEPENDENCY_LOOKBACK,
      expect.any(AbortSignal)
    );

    nowSpy.mockReturnValue(2000);
    await result.current.refetch();

    expect(jaegerClient.fetchDependencies).toHaveBeenLastCalledWith(
      2000,
      DEFAULT_DEPENDENCY_LOOKBACK,
      expect.any(AbortSignal)
    );
  });

  it('reuses fresh data cached under the existing query key', () => {
    const wrapper = createWrapper();
    const deps = [{ parent: 'a', child: 'b', callCount: 1 }];
    queryClient.setQueryData(['dependencies', 'Backend', null, DEFAULT_DEPENDENCY_LOOKBACK], deps);

    const { result } = renderHook(() => useDependenciesQuery(), { wrapper });

    expect(result.current.data).toEqual(deps);
    expect(jaegerClient.fetchDependencies).not.toHaveBeenCalled();
  });

  it('exposes request failures through the query error state', async () => {
    const error = new Error('Failed to fetch dependencies: 503 Service Unavailable');
    vi.mocked(jaegerClient.fetchDependencies).mockRejectedValue(error);

    const { result } = renderHook(() => useDependenciesQuery(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });

  // Vitest sets `import.meta.env.DEV` to `true`, so these tests exercise the
  // dev branches that Vite constant-folds away in production builds. The
  // "production" path (dev sources falling back to the backend) is verified by
  // the build itself — `small-*.js` / `large-*.js` chunks must not exist in
  // the production output — and isn't reproducible at test runtime.
  it('loads the small graph sample without hitting the API', async () => {
    const { result } = renderHook(() => useDependenciesQuery('Small Graph'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchDependencies).not.toHaveBeenCalled();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('loads the large graph sample without hitting the API', async () => {
    const { result } = renderHook(() => useDependenciesQuery('Large Graph'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchDependencies).not.toHaveBeenCalled();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
