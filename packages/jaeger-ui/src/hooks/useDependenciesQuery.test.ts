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
    vi.restoreAllMocks();
  });

  it('fetches dependencies and returns the data array for the Backend source', async () => {
    const deps = [{ parent: 'a', child: 'b', callCount: 1 }];
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: deps });

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deps);
    expect(JaegerAPI.fetchDependencies).toHaveBeenCalledWith(expect.any(Number), DEFAULT_DEPENDENCY_LOOKBACK);
  });

  it('defaults to the Backend source when called without arguments', async () => {
    const deps = [{ parent: 'a', child: 'b', callCount: 1 }];
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: deps });

    const { result } = renderHook(() => useDependenciesQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JaegerAPI.fetchDependencies).toHaveBeenCalled();
  });

  it('passes explicit endTs and lookback through to the API call', async () => {
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    const { result } = renderHook(
      () => useDependenciesQuery('Backend', { endTs: 12345, lookback: 3600000 }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JaegerAPI.fetchDependencies).toHaveBeenCalledWith(12345, 3600000);
  });

  it('returns a raw array response unchanged (no `data` envelope)', async () => {
    const deps = [{ parent: 'svc-a', child: 'svc-b', callCount: 7 }];
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue(deps);

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deps);
  });

  it('returns [] when response.data is not an array', async () => {
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'unexpected' });

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('returns [] for an unrecognised response shape (neither array nor `data` envelope)', async () => {
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('resolves endTs lazily so refetches advance the time window', async () => {
    (JaegerAPI.fetchDependencies as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1000);

    const { result } = renderHook(() => useDependenciesQuery('Backend'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JaegerAPI.fetchDependencies).toHaveBeenNthCalledWith(1, 1000, DEFAULT_DEPENDENCY_LOOKBACK);

    nowSpy.mockReturnValue(2000);
    await result.current.refetch();

    expect(JaegerAPI.fetchDependencies).toHaveBeenLastCalledWith(2000, DEFAULT_DEPENDENCY_LOOKBACK);
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
    expect(JaegerAPI.fetchDependencies).not.toHaveBeenCalled();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('loads the large graph sample without hitting the API', async () => {
    const { result } = renderHook(() => useDependenciesQuery('Large Graph'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JaegerAPI.fetchDependencies).not.toHaveBeenCalled();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});
