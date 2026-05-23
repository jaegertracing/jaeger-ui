// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useServices, useSpanNames, useSearchTraces } from './useTraceDiscovery';
import { jaegerClient } from '../api/v3/client';
import type { SearchQuery } from '../types/search';

vi.mock('../api/v3/client', () => ({
  jaegerClient: {
    fetchServices: vi.fn(),
    fetchSpanNames: vi.fn(),
    fetchTraceSummaries: vi.fn(),
  },
}));

describe('useTraceDiscovery', () => {
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

  describe('useServices', () => {
    it('returns loading state initially', () => {
      (jaegerClient.fetchServices as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('successfully fetches and returns services data (sorted)', async () => {
      const mockServices = ['service-c', 'service-a', 'service-b'];
      (jaegerClient.fetchServices as ReturnType<typeof vi.fn>).mockResolvedValue(mockServices);

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(['service-a', 'service-b', 'service-c']);
      expect(jaegerClient.fetchServices).toHaveBeenCalledTimes(1);
    });

    it('uses correct query key', async () => {
      const mockServices = ['service-a'];
      (jaegerClient.fetchServices as ReturnType<typeof vi.fn>).mockResolvedValue(mockServices);

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ queryKey: ['services'] });
      expect(queries).toHaveLength(1);
    });

    it('handles errors from fetchServices', async () => {
      const mockError = new Error('Failed to fetch services');
      (jaegerClient.fetchServices as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.data).toBeUndefined();
    });

    it('returns empty array when API returns empty services', async () => {
      (jaegerClient.fetchServices as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useSpanNames', () => {
    it('returns loading state initially when service is provided', () => {
      (jaegerClient.fetchSpanNames as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useSpanNames('test-service'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('successfully fetches span names for a given service (sorted)', async () => {
      const mockOperations = [
        { name: 'POST /api/orders', spanKind: 'server' },
        { name: 'GET /api/users', spanKind: 'server' },
      ];
      (jaegerClient.fetchSpanNames as ReturnType<typeof vi.fn>).mockResolvedValue(mockOperations);

      const { result } = renderHook(() => useSpanNames('my-service'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([
        { name: 'GET /api/users', spanKind: 'server' },
        { name: 'POST /api/orders', spanKind: 'server' },
      ]);
      expect(jaegerClient.fetchSpanNames).toHaveBeenCalledWith('my-service');
      expect(jaegerClient.fetchSpanNames).toHaveBeenCalledTimes(1);
    });

    it('uses correct query key with service parameter', async () => {
      const mockOperations = [{ name: 'op1', spanKind: 'server' }];
      (jaegerClient.fetchSpanNames as ReturnType<typeof vi.fn>).mockResolvedValue(mockOperations);

      const { result } = renderHook(() => useSpanNames('test-service'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ queryKey: ['spanNames', 'test-service'] });
      expect(queries).toHaveLength(1);
    });

    it('is disabled when service is null', () => {
      const { result } = renderHook(() => useSpanNames(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(jaegerClient.fetchSpanNames).not.toHaveBeenCalled();
    });

    it('is disabled when service is empty string', () => {
      const { result } = renderHook(() => useSpanNames(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(jaegerClient.fetchSpanNames).not.toHaveBeenCalled();
    });

    it('handles errors from fetchSpanNames', async () => {
      const mockError = new Error('Failed to fetch span names');
      (jaegerClient.fetchSpanNames as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSpanNames('test-service'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
      expect(result.current.data).toBeUndefined();
    });

    it('returns empty array when API returns empty operations', async () => {
      (jaegerClient.fetchSpanNames as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useSpanNames('empty-service'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('refetches when service parameter changes', async () => {
      const mockOps1 = [{ name: 'op1', spanKind: 'server' }];
      const mockOps2 = [{ name: 'op2', spanKind: 'client' }];
      (jaegerClient.fetchSpanNames as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockOps1)
        .mockResolvedValueOnce(mockOps2);

      const { result, rerender } = renderHook(({ service }) => useSpanNames(service), {
        wrapper: createWrapper(),
        initialProps: { service: 'service-1' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual(mockOps1);

      rerender({ service: 'service-2' });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockOps2);
      });

      expect(jaegerClient.fetchSpanNames).toHaveBeenCalledTimes(2);
      expect(jaegerClient.fetchSpanNames).toHaveBeenNthCalledWith(1, 'service-1');
      expect(jaegerClient.fetchSpanNames).toHaveBeenNthCalledWith(2, 'service-2');
    });

    it('stops fetching when service becomes null', async () => {
      const mockOps = [{ name: 'op1', spanKind: 'server' }];
      (jaegerClient.fetchSpanNames as ReturnType<typeof vi.fn>).mockResolvedValue(mockOps);

      const { result, rerender } = renderHook(({ service }) => useSpanNames(service), {
        wrapper: createWrapper(),
        initialProps: { service: 'service-1' as string | null },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual(mockOps);

      vi.clearAllMocks();

      rerender({ service: null });

      expect(result.current.fetchStatus).toBe('idle');
      expect(jaegerClient.fetchSpanNames).not.toHaveBeenCalled();
    });

    it('filters by spanKind when provided', async () => {
      const mockOps = [
        { name: 'op1', spanKind: 'server' },
        { name: 'op2', spanKind: 'client' },
        { name: 'op3', spanKind: 'server' },
      ];
      (jaegerClient.fetchSpanNames as ReturnType<typeof vi.fn>).mockResolvedValue(mockOps);

      const { result } = renderHook(() => useSpanNames('service-1', 'server'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([
        { name: 'op1', spanKind: 'server' },
        { name: 'op3', spanKind: 'server' },
      ]);
      expect(jaegerClient.fetchSpanNames).toHaveBeenCalledWith('service-1');
    });

    it('returns all ops when spanKind is not provided', async () => {
      const mockOps = [
        { name: 'op1', spanKind: 'server' },
        { name: 'op2', spanKind: 'client' },
      ];
      (jaegerClient.fetchSpanNames as ReturnType<typeof vi.fn>).mockResolvedValue(mockOps);

      const { result } = renderHook(() => useSpanNames('service-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOps);
    });
  });

  describe('useSearchTraces', () => {
    const query: SearchQuery = {
      service: 'my-svc',
      operation: null,
      start: '0',
      end: '0',
      limit: 20,
      lookback: '1h',
      minDuration: undefined,
      maxDuration: undefined,
      tags: null,
    };

    it('is disabled when query is null', () => {
      const { result } = renderHook(() => useSearchTraces(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(jaegerClient.fetchTraceSummaries).not.toHaveBeenCalled();
    });

    it('calls fetchTraceSummaries with the provided query', async () => {
      const mockSummaries = [
        {
          traceID: 'aaaabbbbccccdddd0000111122223333',
          traceName: 'my-svc: op',
          rootServiceName: 'my-svc',
          rootOperationName: 'op',
          startTime: 1000,
          duration: 500,
          spanCount: 3,
          errorSpanCount: 0,
          orphanSpanCount: 0,
          services: [],
        },
      ];
      (jaegerClient.fetchTraceSummaries as ReturnType<typeof vi.fn>).mockResolvedValue(mockSummaries);

      const { result } = renderHook(() => useSearchTraces(query), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(jaegerClient.fetchTraceSummaries).toHaveBeenCalledWith(query);
      expect(result.current.data).toEqual(mockSummaries);
    });

    it('uses a fixed singleton queryKey', async () => {
      (jaegerClient.fetchTraceSummaries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useSearchTraces(query), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const queries = queryClient.getQueryCache().findAll({ queryKey: ['traceSummaries'] });
      expect(queries).toHaveLength(1);
    });

    it('handles errors from fetchTraceSummaries', async () => {
      const mockError = new Error('Search failed');
      (jaegerClient.fetchTraceSummaries as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      const { result } = renderHook(() => useSearchTraces(query), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });
});
