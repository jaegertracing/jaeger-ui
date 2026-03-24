// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useServices, useSpanNames } from './useTraceDiscovery';
import { jaegerClient } from '../api/v3/client';

jest.mock('../api/v3/client', () => ({
  jaegerClient: {
    fetchServices: jest.fn(),
    fetchSpanNames: jest.fn(),
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
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('useServices', () => {
    it('returns loading state initially', () => {
      (jaegerClient.fetchServices as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('successfully fetches and returns services data', async () => {
      const mockServices = ['service-a', 'service-b', 'service-c'];
      (jaegerClient.fetchServices as jest.Mock).mockResolvedValue(mockServices);

      const { result } = renderHook(() => useServices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockServices);
      expect(jaegerClient.fetchServices).toHaveBeenCalledTimes(1);
    });

    it('uses correct query key', async () => {
      const mockServices = ['service-a'];
      (jaegerClient.fetchServices as jest.Mock).mockResolvedValue(mockServices);

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
      (jaegerClient.fetchServices as jest.Mock).mockRejectedValue(mockError);

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
      (jaegerClient.fetchServices as jest.Mock).mockResolvedValue([]);

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
      (jaegerClient.fetchSpanNames as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useSpanNames('test-service'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('successfully fetches span names for a given service', async () => {
      const mockOperations = [
        { name: 'GET /api/users', spanKind: 'server' },
        { name: 'POST /api/orders', spanKind: 'server' },
      ];
      (jaegerClient.fetchSpanNames as jest.Mock).mockResolvedValue(mockOperations);

      const { result } = renderHook(() => useSpanNames('my-service'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOperations);
      expect(jaegerClient.fetchSpanNames).toHaveBeenCalledWith('my-service');
      expect(jaegerClient.fetchSpanNames).toHaveBeenCalledTimes(1);
    });

    it('uses correct query key with service parameter', async () => {
      const mockOperations = [{ name: 'op1', spanKind: 'server' }];
      (jaegerClient.fetchSpanNames as jest.Mock).mockResolvedValue(mockOperations);

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
      (jaegerClient.fetchSpanNames as jest.Mock).mockRejectedValue(mockError);

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
      (jaegerClient.fetchSpanNames as jest.Mock).mockResolvedValue([]);

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
      (jaegerClient.fetchSpanNames as jest.Mock)
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
      (jaegerClient.fetchSpanNames as jest.Mock).mockResolvedValue(mockOps);

      const { result, rerender } = renderHook(({ service }) => useSpanNames(service), {
        wrapper: createWrapper(),
        initialProps: { service: 'service-1' as string | null },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual(mockOps);

      jest.clearAllMocks();

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
      (jaegerClient.fetchSpanNames as jest.Mock).mockResolvedValue(mockOps);

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
      (jaegerClient.fetchSpanNames as jest.Mock).mockResolvedValue(mockOps);

      const { result } = renderHook(() => useSpanNames('service-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOps);
    });
  });
});
