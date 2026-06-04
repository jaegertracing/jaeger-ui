// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import JaegerAPI from '../api/jaeger';
import transformDdgData from '../model/ddg/transformDdgData';
import { useDeepDependencyGraphQuery } from './useDeepDependencyGraphQuery';

vi.mock('../api/jaeger', () => ({
  default: {
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
    expect(JaegerAPI.fetchDeepDependencyGraph).not.toHaveBeenCalled();
  });

  it('fetches and transforms the graph payload', async () => {
    const payload = { dependencies: [{ path: [], attributes: [] }] };
    (JaegerAPI.fetchDeepDependencyGraph as ReturnType<typeof vi.fn>).mockResolvedValue(payload);

    const { result } = renderHook(() => useDeepDependencyGraphQuery(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JaegerAPI.fetchDeepDependencyGraph).toHaveBeenCalledWith({
      service: 'svc',
      operation: 'op',
      start: 0,
      end: 0,
    });
    expect(transformDdgData).toHaveBeenCalledWith(payload, { service: 'svc', operation: 'op' });
    expect(result.current.data?.hash).toBe('h1');
  });
});
