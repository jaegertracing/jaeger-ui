// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { jaegerClient } from '../api/v3/client';
import transformDdgData from '../model/ddg/transformDdgData';
import {
  useDeepDependencyGraphQuery,
  useDeepDependencyGraphQueryFromUrl,
} from './useDeepDependencyGraphQuery';

vi.mock('../api/v3/client', () => ({
  jaegerClient: {
    fetchDeepDependencyGraph: vi.fn(),
  },
}));

vi.mock('../model/ddg/transformDdgData', () => ({
  default: vi.fn(),
}));

describe('useDeepDependencyGraphQuery', () => {
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

  const params = { service: 'svc', operation: 'op', start: 0, end: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transformDdgData).mockReturnValue({
      hash: 'h1',
      distanceToPathElems: new Map(),
      paths: [],
      services: new Map(),
      visIdxToPathElem: [],
    });
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('does not fetch when params are null', () => {
    renderHook(() => useDeepDependencyGraphQuery(null), { wrapper: createWrapper() });
    expect(jaegerClient.fetchDeepDependencyGraph).not.toHaveBeenCalled();
  });

  it('fetches and transforms the graph payload', async () => {
    const payload = { dependencies: [{ path: [], attributes: [] }] };
    (jaegerClient.fetchDeepDependencyGraph as ReturnType<typeof vi.fn>).mockResolvedValue(payload);

    const { result } = renderHook(() => useDeepDependencyGraphQuery(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchDeepDependencyGraph).toHaveBeenCalledWith(
      {
        service: 'svc',
        operation: 'op',
        start: 0,
        end: 0,
      },
      expect.any(AbortSignal)
    );
    expect(transformDdgData).toHaveBeenCalledWith(payload, { service: 'svc', operation: 'op' });
    expect(result.current.data?.hash).toBe('h1');
  });

  it('normalizes an unrecognised API response to an empty dependencies payload', async () => {
    (jaegerClient.fetchDeepDependencyGraph as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { result } = renderHook(() => useDeepDependencyGraphQuery(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(transformDdgData).toHaveBeenCalledWith({ dependencies: [] }, { service: 'svc', operation: 'op' });
  });

  it('reuses fresh data cached under the existing query key', () => {
    const wrapper = createWrapper();
    const paramsWithTimeRange = { ...params, start: 100, end: 200 };
    const model = {
      hash: 'cached',
      distanceToPathElems: new Map(),
      paths: [],
      services: new Map(),
      visIdxToPathElem: [],
    };
    queryClient.setQueryData(['ddg', 'svc', 'op', 100, 200], model);

    const { result } = renderHook(() => useDeepDependencyGraphQuery(paramsWithTimeRange), { wrapper });

    expect(result.current.data).toEqual(model);
    expect(jaegerClient.fetchDeepDependencyGraph).not.toHaveBeenCalled();
  });

  it('exposes request failures without transforming an error response', async () => {
    const error = new Error('Failed to fetch deep dependencies: 503 Service Unavailable');
    vi.mocked(jaegerClient.fetchDeepDependencyGraph).mockRejectedValue(error);

    const { result } = renderHook(() => useDeepDependencyGraphQuery(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(transformDdgData).not.toHaveBeenCalled();
  });
});

describe('useDeepDependencyGraphQueryFromUrl', () => {
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
    vi.mocked(transformDdgData).mockReturnValue({
      hash: 'h1',
      distanceToPathElems: new Map(),
      paths: [],
      services: new Map(),
      visIdxToPathElem: [],
    });
    (jaegerClient.fetchDeepDependencyGraph as ReturnType<typeof vi.fn>).mockResolvedValue({
      dependencies: [],
    });
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('does not fetch when service is undefined', () => {
    renderHook(() => useDeepDependencyGraphQueryFromUrl(undefined, 'op'), {
      wrapper: createWrapper(),
    });
    expect(jaegerClient.fetchDeepDependencyGraph).not.toHaveBeenCalled();
  });

  it('fetches with default start and end when service is set', async () => {
    const { result } = renderHook(() => useDeepDependencyGraphQueryFromUrl('svc', 'op'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchDeepDependencyGraph).toHaveBeenCalledWith(
      {
        service: 'svc',
        operation: 'op',
        start: 0,
        end: 0,
      },
      expect.any(AbortSignal)
    );
  });

  it('forwards custom start and end to the API', async () => {
    const { result } = renderHook(() => useDeepDependencyGraphQueryFromUrl('svc', undefined, 100, 200), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchDeepDependencyGraph).toHaveBeenCalledWith(
      {
        service: 'svc',
        operation: undefined,
        start: 100,
        end: 200,
      },
      expect.any(AbortSignal)
    );
  });
});
