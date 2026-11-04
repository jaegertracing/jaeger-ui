// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import usePathAgnosticDecoration from './usePathAgnosticDecoration';
import { jaegerClient } from '../api/v3/client';
import getConfig from '../utils/config/get-config';
import defaultConfig from '../constants/default-config';

vi.mock('../utils/config/get-config');

// Replaces the action tests for URL selection, fallback, errors and request deduplication,
// and the reducer tests for independent scales, retained maxima and values across nodes.
// Promise batching and immutable Redux merges disappear with the removed implementation.
describe('usePathAgnosticDecoration', () => {
  let client: QueryClient;
  const schema = {
    id: 'latency',
    name: 'Latency',
    acronym: 'L',
    summaryUrl: '/summary',
    summaryPath: 'services.#{service}',
    opSummaryUrl: '/operations?service=#{service}',
    opSummaryPath: 'operations.#{operation}',
  };
  const props = {
    service: 'frontend',
    search: '?decoration=latency',
    operation: null as string | string[] | null,
  };
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  const fetchDecoration = vi.spyOn(jaegerClient, 'fetchDecoration');

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(getConfig).mockReturnValue({ ...defaultConfig, pathAgnosticDecorations: [schema] });
    fetchDecoration.mockReset().mockResolvedValue({ services: { frontend: 42, backend: 108 } });
  });

  afterEach(() => {
    client.clear();
  });

  it.each(['', '?decoration=missing'])('does not fetch for an absent or unknown decoration: %s', search => {
    const { result } = renderHook(() => usePathAgnosticDecoration({ ...props, search }), { wrapper });
    expect(result.current.decorationValue).toBeUndefined();
    expect(fetchDecoration).not.toHaveBeenCalled();
  });

  it('does not fetch without configured schemas', () => {
    vi.mocked(getConfig).mockReturnValue({ ...defaultConfig });
    renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    expect(fetchDecoration).not.toHaveBeenCalled();
  });

  it('defaults an omitted search to no decoration', () => {
    renderHook(() => usePathAgnosticDecoration({ service: props.service }), { wrapper });
    expect(fetchDecoration).not.toHaveBeenCalled();
  });

  it('uses the first decoration in the URL', async () => {
    const { result } = renderHook(
      () => usePathAgnosticDecoration({ ...props, search: '?decoration=latency&decoration=missing' }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.decorationValue).toBe(42));
    expect(result.current.decorationID).toBe('latency');
  });

  it('fetches a service summary and its numeric maximum', async () => {
    const { result } = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    await waitFor(() => expect(result.current.decorationValue).toBe(42));
    expect(result.current.decorationMax).toBe(42);
    expect(fetchDecoration).toHaveBeenCalledWith('/summary');
  });

  it('prefers operation summaries and substitutes the configured URL and path', async () => {
    fetchDecoration.mockResolvedValue({ operations: { GET: 17 } });
    const { result } = renderHook(() => usePathAgnosticDecoration({ ...props, operation: 'GET' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.decorationValue).toBe(17));
    expect(fetchDecoration).toHaveBeenCalledWith('/operations?service=frontend');
  });

  it.each([null, ['GET', 'POST']])('uses the service summary without a single operation: %j', operation => {
    renderHook(() => usePathAgnosticDecoration({ ...props, operation }), { wrapper });
    expect(fetchDecoration).toHaveBeenCalledWith('/summary');
  });

  it.each(['opSummaryUrl', 'opSummaryPath'] as const)('uses the service summary without %s', field => {
    vi.mocked(getConfig).mockReturnValue({
      ...defaultConfig,
      pathAgnosticDecorations: [{ ...schema, [field]: undefined }],
    });
    renderHook(() => usePathAgnosticDecoration({ ...props, operation: 'GET' }), { wrapper });
    expect(fetchDecoration).toHaveBeenCalledWith('/summary');
  });

  it('deduplicates a shared URL and updates the maximum for already-rendered nodes', async () => {
    const first = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    await waitFor(() => expect(first.result.current.decorationMax).toBe(42));
    const second = renderHook(() => usePathAgnosticDecoration({ ...props, service: 'backend' }), { wrapper });
    await waitFor(() => expect(second.result.current.decorationValue).toBe(108));
    await waitFor(() => expect(first.result.current.decorationMax).toBe(108));
    expect(fetchDecoration).toHaveBeenCalledTimes(1);
  });

  it('deduplicates in-flight requests', async () => {
    let resolve!: (value: unknown) => void;
    fetchDecoration.mockReturnValue(
      new Promise(res => {
        resolve = res;
      })
    );
    const first = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    const second = renderHook(() => usePathAgnosticDecoration({ ...props, service: 'backend' }), { wrapper });
    expect(fetchDecoration).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ services: { frontend: 42, backend: 108 } }));
    await waitFor(() => expect(first.result.current.decorationValue).toBe(42));
    await waitFor(() => expect(second.result.current.decorationValue).toBe(108));
  });

  it('keeps operation and service maxima separate and ignores strings', async () => {
    fetchDecoration.mockImplementation(async url =>
      url === '/summary'
        ? { services: { frontend: 108 } }
        : { operations: { GET: 42, POST: 17, error: 'Unavailable' } }
    );
    const service = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    const get = renderHook(() => usePathAgnosticDecoration({ ...props, operation: 'GET' }), { wrapper });
    const post = renderHook(() => usePathAgnosticDecoration({ ...props, operation: 'POST' }), { wrapper });
    const error = renderHook(() => usePathAgnosticDecoration({ ...props, operation: 'error' }), { wrapper });
    await waitFor(() => expect(service.result.current.decorationMax).toBe(108));
    await waitFor(() => expect(get.result.current.decorationValue).toBe(42));
    await waitFor(() => expect(post.result.current.decorationMax).toBe(42));
    await waitFor(() => expect(error.result.current.decorationValue).toBe('Unavailable'));
    expect(get.result.current.decorationMax).toBe(42);
  });

  it('keeps values and maxima isolated between decorations sharing a URL', async () => {
    vi.mocked(getConfig).mockReturnValue({
      ...defaultConfig,
      pathAgnosticDecorations: [
        schema,
        {
          ...schema,
          id: 'other',
          summaryPath: 'other.#{service}',
        },
      ],
    });
    fetchDecoration.mockResolvedValue({ services: { frontend: 42 }, other: { frontend: 108 } });
    const first = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    const second = renderHook(() => usePathAgnosticDecoration({ ...props, search: '?decoration=other' }), {
      wrapper,
    });
    await waitFor(() => expect(first.result.current.decorationValue).toBe(42));
    await waitFor(() => expect(second.result.current.decorationValue).toBe(108));
    expect(first.result.current.decorationMax).toBe(42);
    expect(second.result.current.decorationMax).toBe(108);
    expect(fetchDecoration).toHaveBeenCalledTimes(1);
  });

  it.each([0, ''])(
    'keeps the cached service fallback for a falsy operation value: %j',
    async operationValue => {
      const { result, rerender } = renderHook(usePathAgnosticDecoration, { initialProps: props, wrapper });
      await waitFor(() => expect(result.current.decorationValue).toBe(42));
      let resolve!: (value: unknown) => void;
      fetchDecoration.mockReturnValue(
        new Promise(res => {
          resolve = res;
        })
      );
      rerender({ ...props, operation: 'GET' });
      expect(result.current.decorationValue).toBe(42);
      expect(result.current.decorationMax).toBe(42);
      await act(async () => resolve({ operations: { GET: operationValue } }));
      await waitFor(() =>
        expect(
          client
            .getQueryCache()
            .findAll({ queryKey: ['decoration-summary'] })
            .some(query => query.state.data === operationValue)
        ).toBe(true)
      );
      expect(result.current.decorationValue).toBe(42);
      expect(result.current.decorationMax).toBe(42);
    }
  );

  it('retains the session maximum and cached values after a maximum node is hidden', async () => {
    const first = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    const second = renderHook(() => usePathAgnosticDecoration({ ...props, service: 'backend' }), { wrapper });
    await waitFor(() => expect(first.result.current.decorationMax).toBe(108));
    await waitFor(() => expect(second.result.current.decorationValue).toBe(108));
    vi.useFakeTimers();
    try {
      second.unmount();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
      });
      expect(first.result.current.decorationMax).toBe(108);
      const remounted = renderHook(() => usePathAgnosticDecoration({ ...props, service: 'backend' }), {
        wrapper,
      });
      expect(remounted.result.current.decorationValue).toBe(108);
      expect(fetchDecoration).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bounds cache-wide scans as multiple decorated nodes resolve', async () => {
    const nodeCount = 50;
    fetchDecoration.mockResolvedValue({
      services: Object.fromEntries(Array.from({ length: nodeCount }, (_, i) => [String(i), i])),
    });
    const scans = vi.spyOn(client.getQueryCache(), 'findAll');
    function Node({ service }: { service: string }) {
      const decoration = usePathAgnosticDecoration({ ...props, service });
      return React.createElement('span', { 'data-testid': 'maximum' }, String(decoration.decorationMax));
    }
    const { getAllByTestId } = render(
      React.createElement(
        React.Fragment,
        null,
        ...Array.from({ length: nodeCount }, (_, i) =>
          React.createElement(Node, { key: i, service: String(i) })
        )
      ),
      { wrapper }
    );
    await waitFor(() =>
      expect(getAllByTestId('maximum').every(node => node.textContent === '49')).toBe(true)
    );
    expect(scans.mock.calls.length).toBeLessThan(nodeCount * 10);
    expect(fetchDecoration).toHaveBeenCalledTimes(1);
  });

  it('changes values when service or operation changes without a remount', async () => {
    const { result, rerender } = renderHook(usePathAgnosticDecoration, { initialProps: props, wrapper });
    await waitFor(() => expect(result.current.decorationValue).toBe(42));
    rerender({ ...props, service: 'backend' });
    await waitFor(() => expect(result.current.decorationValue).toBe(108));
    fetchDecoration.mockResolvedValue({ operations: { GET: 17, POST: 23 } });
    rerender({ ...props, operation: 'GET' });
    await waitFor(() => expect(result.current.decorationValue).toBe(17));
    rerender({ ...props, operation: 'POST' });
    await waitFor(() => expect(result.current.decorationValue).toBe(23));
  });

  it('reuses cached values on remount', async () => {
    const first = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    await waitFor(() => expect(first.result.current.decorationValue).toBe(42));
    first.unmount();
    const second = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    expect(second.result.current.decorationValue).toBe(42);
    expect(fetchDecoration).toHaveBeenCalledTimes(1);
  });

  it('does not show a previous decoration after switching or clearing the URL selection', async () => {
    vi.mocked(getConfig).mockReturnValue({
      ...defaultConfig,
      pathAgnosticDecorations: [schema, { ...schema, id: 'other', summaryUrl: '/other' }],
    });
    let resolve!: (value: unknown) => void;
    fetchDecoration.mockImplementation(url =>
      url === '/summary'
        ? new Promise(res => {
            resolve = res;
          })
        : Promise.resolve({ services: { frontend: 17 } })
    );
    const { result, rerender } = renderHook(usePathAgnosticDecoration, { initialProps: props, wrapper });
    rerender({ ...props, search: '?decoration=other' });
    await waitFor(() => expect(result.current.decorationValue).toBe(17));
    await act(async () => resolve({ services: { frontend: 108 } }));
    expect(result.current.decorationValue).toBe(17);
    expect(result.current.decorationMax).toBe(17);
    rerender({ ...props, search: '' });
    expect(result.current.decorationID).toBeUndefined();
    expect(result.current.decorationValue).toBeUndefined();
  });

  it('combines operation maxima across services without overwriting other operations', async () => {
    fetchDecoration.mockImplementation(async url => ({
      operations: url.endsWith('backend') ? { GET: 108 } : { GET: 42, POST: 17 },
    }));
    const first = renderHook(() => usePathAgnosticDecoration({ ...props, operation: 'GET' }), { wrapper });
    const second = renderHook(() => usePathAgnosticDecoration({ ...props, operation: 'POST' }), { wrapper });
    const third = renderHook(
      () => usePathAgnosticDecoration({ ...props, service: 'backend', operation: 'GET' }),
      { wrapper }
    );
    await waitFor(() => expect(third.result.current.decorationValue).toBe(108));
    await waitFor(() => expect(first.result.current.decorationMax).toBe(108));
    expect(first.result.current.decorationValue).toBe(42);
    expect(second.result.current.decorationValue).toBe(17);
    expect(second.result.current.decorationMax).toBe(108);
  });

  it('does not expose old values when the configured endpoint changes', async () => {
    const { result, rerender } = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    await waitFor(() => expect(result.current.decorationValue).toBe(42));
    vi.mocked(getConfig).mockReturnValue({
      ...defaultConfig,
      pathAgnosticDecorations: [{ ...schema, summaryUrl: '/new' }],
    });
    fetchDecoration.mockResolvedValue({ services: { frontend: 17 } });
    rerender();
    expect(result.current.decorationValue).toBeUndefined();
    await waitFor(() => expect(result.current.decorationValue).toBe(17));
    expect(result.current.decorationMax).toBe(17);
  });

  it.each([new Error('offline'), 'offline'])('renders request failures as decoration text: %s', error => {
    fetchDecoration.mockRejectedValue(error);
    const { result } = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    return waitFor(() => expect(result.current.decorationValue).toBe('Unable to fetch decoration: offline'));
  });

  it('renders the missing-path message', async () => {
    fetchDecoration.mockResolvedValue({});
    const { result } = renderHook(() => usePathAgnosticDecoration(props), { wrapper });
    await waitFor(() =>
      expect(result.current.decorationValue).toBe('`services.frontend` not found in response')
    );
  });
});
