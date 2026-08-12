// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useServices, useSpanNames, useSearchTraces } from './useTraceDiscovery';
import { jaegerClient } from '../api/v3/client';
import { trackSearchLatency } from '../components/SearchTracePage/SearchResults/index.track';
import type { SearchQuery } from '../types/search';

vi.mock('../api/v3/client', () => ({
  jaegerClient: {
    fetchServices: vi.fn(),
    fetchSpanNames: vi.fn(),
    fetchTraceSummaries: vi.fn(),
  },
}));

vi.mock('../components/SearchTracePage/SearchResults/index.track', () => ({
  trackSearchLatency: vi.fn(),
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
      operation: undefined,
      start: '0',
      end: '0',
      limit: 20,
      lookback: '1h',
      minDuration: undefined,
      maxDuration: undefined,
      tags: undefined,
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
      expect(result.current.data).toEqual({
        results: mockSummaries,
        query,
        searchLatency: expect.any(Number),
      });
    });

    it('measures and tracks the search request latency', async () => {
      (jaegerClient.fetchTraceSummaries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useSearchTraces(query), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.searchLatency).toEqual(expect.any(Number));
      expect(result.current.data?.searchLatency).toBeGreaterThanOrEqual(0);
      expect(trackSearchLatency).toHaveBeenCalledWith(expect.any(Number));
    });

    it('uses a queryKey parameterized by the query', async () => {
      (jaegerClient.fetchTraceSummaries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useSearchTraces(query), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const queries = queryClient.getQueryCache().findAll({ queryKey: ['traceSummaries'] });
      expect(queries).toHaveLength(1);
      expect(queries[0].queryKey).toEqual(['traceSummaries', query]);
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

    it('evicts stale cache entries when a new query is provided', async () => {
      const query2: SearchQuery = { ...query, service: 'other-svc' };
      (jaegerClient.fetchTraceSummaries as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      // Prime the cache with query1
      const { rerender } = renderHook(({ q }) => useSearchTraces(q), {
        wrapper: createWrapper(),
        initialProps: { q: query as SearchQuery | null },
      });
      await waitFor(() => {
        expect(queryClient.getQueryCache().findAll({ queryKey: ['traceSummaries'] })).toHaveLength(1);
      });

      // Switch to query2 — the eviction effect should remove the query1 entry
      rerender({ q: query2 });
      await waitFor(() => {
        const entries = queryClient.getQueryCache().findAll({ queryKey: ['traceSummaries'] });
        expect(entries).toHaveLength(1);
        expect(entries[0].queryKey).toEqual(['traceSummaries', query2]);
      });
    });

    it('returns cached data when called with null after a successful fetch', async () => {
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

      // Fetch with a real query
      const { rerender, result } = renderHook(({ q }) => useSearchTraces(q), {
        wrapper: createWrapper(),
        initialProps: { q: query as SearchQuery | null },
      });
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual({
        results: mockSummaries,
        query,
        searchLatency: expect.any(Number),
      });

      // Switch to null (simulates TopNav navigation to bare /search)
      rerender({ q: null });

      // Should surface the cached result via effectiveQuery derived from dataUpdatedAt
      expect(result.current.data).toEqual({
        results: mockSummaries,
        query,
        searchLatency: expect.any(Number),
      });
      expect(jaegerClient.fetchTraceSummaries).toHaveBeenCalledTimes(1);
    });

    it('picks the most recently updated entry when null is passed with multiple entries', async () => {
      const query2: SearchQuery = { ...query, service: 'other-svc' };
      const summaries1 = [
        {
          traceID: 'trace1',
          traceName: 'svc1: op',
          rootServiceName: 'my-svc',
          rootOperationName: 'op',
          startTime: 1000,
          duration: 100,
          spanCount: 1,
          errorSpanCount: 0,
          orphanSpanCount: 0,
          services: [],
        },
      ];
      const summaries2 = [
        {
          traceID: 'trace2',
          traceName: 'svc2: op',
          rootServiceName: 'other-svc',
          rootOperationName: 'op',
          startTime: 2000,
          duration: 200,
          spanCount: 2,
          errorSpanCount: 0,
          orphanSpanCount: 0,
          services: [],
        },
      ];
      (jaegerClient.fetchTraceSummaries as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(summaries1)
        .mockResolvedValueOnce(summaries2);

      const wrapper = createWrapper();

      // Seed two entries directly into the cache with deterministic timestamps.
      // Must be done after createWrapper() since it creates a new queryClient.
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      queryClient.setQueryData(['traceSummaries', query], { results: summaries1, query });
      vi.setSystemTime(2000);
      queryClient.setQueryData(['traceSummaries', query2], { results: summaries2, query: query2 });
      vi.useRealTimers();

      const { result } = renderHook(() => useSearchTraces(null), {
        wrapper,
      });

      // Should return the more recently updated entry (query2)
      expect(result.current.data).toEqual({ results: summaries2, query: query2 });
    });
  });
});
