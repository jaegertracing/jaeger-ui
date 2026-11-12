// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { jaegerClient } from '../../../api/v3/client';
import {
  transformServiceMetrics,
  transformOperationMetrics,
  useServiceMetricsQuery,
  useOperationMetricsQuery,
} from './useMetricsQuery';
import type { MetricsAPIResponse } from '../../../types/metrics';

vi.mock('../../../api/v3/client', () => ({
  jaegerClient: {
    fetchMetrics: vi.fn(),
  },
}));

const metricPoint = { gaugeValue: { doubleValue: 100 }, timestamp: '2021-09-10T11:00:00.000Z' };

const latency50 = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.5,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} satisfies PromiseFulfilledResult<MetricsAPIResponse>;
const latency75 = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.75,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} satisfies PromiseFulfilledResult<MetricsAPIResponse>;
const latency95 = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} satisfies PromiseFulfilledResult<MetricsAPIResponse>;
const callRate = {
  status: 'fulfilled',
  value: {
    name: 'service_call_rate' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} satisfies PromiseFulfilledResult<MetricsAPIResponse>;
const errorRate = {
  status: 'fulfilled',
  value: {
    name: 'service_error_rate' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} satisfies PromiseFulfilledResult<MetricsAPIResponse>;

const fullServicePayload: PromiseSettledResult<MetricsAPIResponse>[] = [
  latency50,
  latency75,
  latency95,
  callRate,
  errorRate,
];

const opsLatencies = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_latencies' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'operation', value: 'op1' }], metricPoints: [metricPoint] }],
  },
} satisfies PromiseFulfilledResult<MetricsAPIResponse<true>>;
const opsCalls = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_call_rate' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'operation', value: 'op1' }], metricPoints: [metricPoint] }],
  },
} satisfies PromiseFulfilledResult<MetricsAPIResponse<true>>;
const opsErrors = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_error_rate' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'operation', value: 'op1' }], metricPoints: [metricPoint] }],
  },
} satisfies PromiseFulfilledResult<MetricsAPIResponse<true>>;

const fullOpsPayload: PromiseSettledResult<MetricsAPIResponse<true>>[] = [opsLatencies, opsCalls, opsErrors];

const nameServiceResults = (payload: PromiseSettledResult<MetricsAPIResponse>[]) => {
  const errorKeys = [
    'service_latencies_50',
    'service_latencies_75',
    'service_latencies_95',
    'service_call_rate',
    'service_error_rate',
  ] as const;
  return payload.map((result, index) => ({ errorKey: errorKeys[index], result }));
};

const nameOperationResults = (payload: PromiseSettledResult<MetricsAPIResponse<true>>[]) => {
  const errorKeys = ['opsLatencies', 'opsCalls', 'opsErrors'] as const;
  return payload.map((result, index) => ({ errorKey: errorKeys[index], result }));
};

describe('transformServiceMetrics', () => {
  it('populates service_latencies array from fulfilled results', () => {
    const result = transformServiceMetrics(nameServiceResults(fullServicePayload));
    expect(result.serviceMetrics.service_latencies).toHaveLength(3);
    expect(result.serviceMetrics.service_latencies![0].quantile).toBe(0.5);
    expect(result.serviceMetrics.service_latencies![1].quantile).toBe(0.75);
    expect(result.serviceMetrics.service_latencies![2].quantile).toBe(0.95);
  });

  it('populates service_call_rate and service_error_rate', () => {
    const result = transformServiceMetrics(nameServiceResults(fullServicePayload));
    expect(result.serviceMetrics.service_call_rate).not.toBeNull();
    expect(result.serviceMetrics.service_error_rate).not.toBeNull();
  });

  it('clears all errors when all promises are fulfilled', () => {
    const result = transformServiceMetrics(nameServiceResults(fullServicePayload));
    expect(result.serviceError.service_latencies_50).toBeNull();
    expect(result.serviceError.service_latencies_75).toBeNull();
    expect(result.serviceError.service_latencies_95).toBeNull();
    expect(result.serviceError.service_call_rate).toBeNull();
    expect(result.serviceError.service_error_rate).toBeNull();
  });

  it('records rejected requests by label rather than position', () => {
    const latencyError = new Error('latency timeout');
    const callRateError = new Error('call-rate timeout');
    const result = transformServiceMetrics([
      { errorKey: 'service_call_rate', result: { status: 'rejected', reason: callRateError } },
      { errorKey: 'service_latencies_50', result: { status: 'rejected', reason: latencyError } },
    ] as any);
    expect(result.serviceError.service_latencies_50).toBe(latencyError);
    expect(result.serviceError.service_call_rate).toBe(callRateError);
    expect(result.serviceError.service_error_rate).toBeNull();
    expect(result.serviceMetrics.service_latencies).toBeNull();
  });

  it('handles metric data with a null doubleValue gracefully', () => {
    const nullPoint = { gaugeValue: { doubleValue: null as any }, timestamp: '2021-01-01T00:00:00.000Z' };
    const payload = [
      {
        status: 'fulfilled',
        value: {
          name: 'service_latencies',
          type: 'GAUGE',
          help: '',
          quantile: 0.5,
          metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [nullPoint] }],
        },
      },
      latency75,
      latency95,
      callRate,
      errorRate,
    ] as PromiseSettledResult<MetricsAPIResponse>[];
    const result = transformServiceMetrics(nameServiceResults(payload));
    expect(result.serviceMetrics.service_latencies![0].metricPoints[0].y).toBeNull();
  });

  it('normalises NaN doubleValue to null and does not corrupt max', () => {
    const nanPoint = { gaugeValue: { doubleValue: NaN }, timestamp: '2021-01-01T00:00:00.000Z' };
    const goodPoint = { gaugeValue: { doubleValue: 50 }, timestamp: '2021-01-01T00:01:00.000Z' };
    const payload = [
      {
        status: 'fulfilled',
        value: {
          name: 'service_latencies',
          type: 'GAUGE',
          help: '',
          quantile: 0.5,
          metrics: [
            { labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [nanPoint, goodPoint] },
          ],
        },
      },
      latency75,
      latency95,
      callRate,
      errorRate,
    ] as PromiseSettledResult<MetricsAPIResponse>[];
    const result = transformServiceMetrics(nameServiceResults(payload));
    const latency = result.serviceMetrics.service_latencies![0];
    // NaN point becomes null, good point becomes 50
    expect(latency.metricPoints[0].y).toBeNull();
    expect(latency.metricPoints[1].y).toBe(50);
    // max should reflect only the valid point, not NaN
    expect(latency.max).toBe(50);
  });

  it.each([Infinity, -Infinity])('renders a non-finite metric %s as a gap', doubleValue => {
    const result = transformServiceMetrics(
      nameServiceResults([
        {
          status: 'fulfilled',
          value: {
            ...latency50.value,
            metrics: [
              {
                labels: latency50.value.metrics[0].labels,
                metricPoints: [{ gaugeValue: { doubleValue }, timestamp: metricPoint.timestamp }],
              },
            ],
          },
        },
      ])
    );
    expect(result.serviceMetrics.service_latencies![0].metricPoints[0].y).toBeNull();
  });

  it('returns empty metrics when payload has no metric entries', () => {
    const empty = [
      {
        status: 'fulfilled',
        value: { name: 'service_latencies', type: 'GAUGE', help: '', quantile: 0.5, metrics: [] },
      },
      {
        status: 'fulfilled',
        value: { name: 'service_latencies', type: 'GAUGE', help: '', quantile: 0.75, metrics: [] },
      },
      {
        status: 'fulfilled',
        value: { name: 'service_latencies', type: 'GAUGE', help: '', quantile: 0.95, metrics: [] },
      },
      {
        status: 'fulfilled',
        value: { name: 'service_call_rate', type: 'GAUGE', help: '', quantile: 0.95, metrics: [] },
      },
      {
        status: 'fulfilled',
        value: { name: 'service_error_rate', type: 'GAUGE', help: '', quantile: 0.95, metrics: [] },
      },
    ] as PromiseSettledResult<MetricsAPIResponse>[];
    const result = transformServiceMetrics(nameServiceResults(empty));
    expect(result.serviceMetrics.service_latencies).toBeNull();
    expect(result.serviceMetrics.service_call_rate).toBeNull();
  });
});

describe('transformOperationMetrics', () => {
  it('produces one ServiceOpsMetrics entry per operation', () => {
    const result = transformOperationMetrics(nameOperationResults(fullOpsPayload));
    expect(result.serviceOpsMetrics).toHaveLength(1);
    expect(result.serviceOpsMetrics![0].name).toBe('op1');
  });

  it('sets impact to 1 when there is exactly one operation', () => {
    const result = transformOperationMetrics(nameOperationResults(fullOpsPayload));
    expect(result.serviceOpsMetrics![0].impact).toBe(1);
  });

  it('normalises impact to [0, 1] across multiple operations', () => {
    const pt = (v: number) => ({ gaugeValue: { doubleValue: v }, timestamp: '2021-01-01T00:00:00.000Z' });
    const payload = [
      {
        status: 'fulfilled',
        value: {
          name: 'service_operation_latencies',
          type: 'GAUGE',
          help: '',
          quantile: 0.95,
          metrics: [
            { labels: [{ name: 'operation', value: 'op1' }], metricPoints: [pt(200)] },
            { labels: [{ name: 'operation', value: 'op2' }], metricPoints: [pt(0)] },
          ],
        },
      },
      {
        status: 'fulfilled',
        value: {
          name: 'service_operation_call_rate',
          type: 'GAUGE',
          help: '',
          quantile: 0.95,
          metrics: [
            { labels: [{ name: 'operation', value: 'op1' }], metricPoints: [pt(50)] },
            { labels: [{ name: 'operation', value: 'op2' }], metricPoints: [pt(0)] },
          ],
        },
      },
      {
        status: 'fulfilled',
        value: {
          name: 'service_operation_error_rate',
          type: 'GAUGE',
          help: '',
          quantile: 0.95,
          metrics: [
            { labels: [{ name: 'operation', value: 'op1' }], metricPoints: [pt(0)] },
            { labels: [{ name: 'operation', value: 'op2' }], metricPoints: [pt(0)] },
          ],
        },
      },
    ] as PromiseSettledResult<MetricsAPIResponse<true>>[];
    const result = transformOperationMetrics(nameOperationResults(payload));
    const impacts = result.serviceOpsMetrics!.map(m => m.impact);
    expect(Math.max(...impacts)).toBe(1);
    expect(Math.min(...impacts)).toBe(0);
  });

  it('records rejected operation requests by label rather than position', () => {
    const latencyError = new Error('latency timeout');
    const errorRateError = new Error('error-rate timeout');
    const result = transformOperationMetrics([
      { errorKey: 'opsErrors', result: { status: 'rejected', reason: errorRateError } },
      { errorKey: 'opsLatencies', result: { status: 'rejected', reason: latencyError } },
    ] as any);
    expect(result.opsError.opsLatencies).toBe(latencyError);
    expect(result.opsError.opsCalls).toBeNull();
    expect(result.opsError.opsErrors).toBe(errorRateError);
    expect(result.serviceOpsMetrics).toBeUndefined();
  });

  it('returns undefined serviceOpsMetrics when metrics array is empty', () => {
    const empty = [
      {
        status: 'fulfilled',
        value: { name: 'service_operation_latencies', type: 'GAUGE', help: '', quantile: 0.95, metrics: [] },
      },
      {
        status: 'fulfilled',
        value: { name: 'service_operation_call_rate', type: 'GAUGE', help: '', quantile: 0.95, metrics: [] },
      },
      {
        status: 'fulfilled',
        value: { name: 'service_operation_error_rate', type: 'GAUGE', help: '', quantile: 0.95, metrics: [] },
      },
    ] as PromiseSettledResult<MetricsAPIResponse<true>>[];
    const result = transformOperationMetrics(nameOperationResults(empty));
    expect(result.serviceOpsMetrics).toBeUndefined();
  });
});

const makeQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

const makeWrapper = (client: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

const baseParams = {
  endTs: 1_700_000_000_000,
  lookback: 3600000,
  step: 60000,
  ratePer: 600000,
  spanKind: 'server' as const,
};

describe('useServiceMetricsQuery', () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = makeQueryClient();
    vi.clearAllMocks();
  });
  afterEach(() => qc.clear());

  it('does not call the API when serviceName is undefined', () => {
    const { result } = renderHook(() => useServiceMetricsQuery(undefined, baseParams), {
      wrapper: makeWrapper(qc),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(jaegerClient.fetchMetrics).not.toHaveBeenCalled();
  });

  it('does not call the API when params are undefined', () => {
    const { result } = renderHook(() => useServiceMetricsQuery('svc', undefined), {
      wrapper: makeWrapper(qc),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(jaegerClient.fetchMetrics).not.toHaveBeenCalled();
  });

  it('fetches and transforms service metrics', async () => {
    vi.mocked(jaegerClient.fetchMetrics)
      .mockResolvedValueOnce({ ...latency50.value })
      .mockResolvedValueOnce({ ...latency75.value })
      .mockResolvedValueOnce({ ...latency95.value })
      .mockResolvedValueOnce({ ...callRate.value })
      .mockResolvedValueOnce({ ...errorRate.value });

    const { result } = renderHook(() => useServiceMetricsQuery('svc', baseParams), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchMetrics).toHaveBeenCalledTimes(5);
    expect(result.current.data!.serviceMetrics.service_latencies).toHaveLength(3);
    expect(result.current.data!.serviceError.service_latencies_50).toBeNull();
  });

  it('keeps successful metrics when one request fails with HTTP 501 details', async () => {
    const failure = Object.assign(new Error('Failed to fetch latencies metrics: 501 Not Implemented'), {
      httpStatus: 501,
      httpBody: 'metrics querying is currently disabled',
    });
    vi.mocked(jaegerClient.fetchMetrics)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ ...latency75.value })
      .mockResolvedValueOnce({ ...latency95.value })
      .mockResolvedValueOnce({ ...callRate.value })
      .mockResolvedValueOnce({ ...errorRate.value });

    const { result } = renderHook(() => useServiceMetricsQuery('svc', baseParams), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.serviceMetrics.service_latencies).toHaveLength(2);
    expect(result.current.data!.serviceMetrics.service_call_rate).not.toBeNull();
    expect(result.current.data!.serviceMetrics.service_error_rate).not.toBeNull();
    expect(result.current.data!.serviceError).toEqual({
      service_latencies_50: {
        message: failure.message,
        httpStatus: 501,
        httpBody: failure.httpBody,
      },
      service_latencies_75: null,
      service_latencies_95: null,
      service_call_rate: null,
      service_error_rate: null,
    });
    expect(jaegerClient.fetchMetrics).toHaveBeenCalledTimes(5);
  });

  it('passes a quantile for every service metrics call', async () => {
    vi.mocked(jaegerClient.fetchMetrics).mockResolvedValue({
      name: 'service_latencies',
      type: 'GAUGE',
      help: '',
      quantile: 0.95,
      metrics: [],
    });

    const { result } = renderHook(() => useServiceMetricsQuery('svc', baseParams), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = vi.mocked(jaegerClient.fetchMetrics).mock.calls;
    expect(calls[0][2]).toMatchObject({ quantile: 0.5 });
    expect(calls[1][2]).toMatchObject({ quantile: 0.75 });
    expect(calls[2][2]).toMatchObject({ quantile: 0.95 });
    expect(calls[3][2]).toMatchObject({ quantile: 0.95 });
    expect(calls[4][2]).toMatchObject({ quantile: 0.95 });
  });

  it('passes endTs from params to all API calls', async () => {
    vi.mocked(jaegerClient.fetchMetrics).mockResolvedValue({
      name: 'service_latencies',
      type: 'GAUGE',
      help: '',
      quantile: 0.95,
      metrics: [],
    });

    const { result } = renderHook(() => useServiceMetricsQuery('svc', baseParams), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (const call of vi.mocked(jaegerClient.fetchMetrics).mock.calls) {
      expect(call[2]).toMatchObject({ endTs: baseParams.endTs });
    }
  });
});

describe('useOperationMetricsQuery', () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = makeQueryClient();
    vi.clearAllMocks();
  });
  afterEach(() => qc.clear());

  it('does not call the API when serviceName is undefined', () => {
    const { result } = renderHook(() => useOperationMetricsQuery(undefined, baseParams), {
      wrapper: makeWrapper(qc),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(jaegerClient.fetchMetrics).not.toHaveBeenCalled();
  });

  it('fetches and transforms operation metrics', async () => {
    vi.mocked(jaegerClient.fetchMetrics)
      .mockResolvedValueOnce({ ...opsLatencies.value })
      .mockResolvedValueOnce({ ...opsCalls.value })
      .mockResolvedValueOnce({ ...opsErrors.value });

    const { result } = renderHook(() => useOperationMetricsQuery('svc', baseParams), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(jaegerClient.fetchMetrics).toHaveBeenCalledTimes(3);
    expect(result.current.data!.serviceOpsMetrics).toHaveLength(1);
    expect(result.current.data!.serviceOpsMetrics![0].name).toBe('op1');
  });

  it('keeps successful operation metrics when the latency request fails', async () => {
    const failure = new Error('latency query failed');
    vi.mocked(jaegerClient.fetchMetrics)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ ...opsCalls.value })
      .mockResolvedValueOnce({ ...opsErrors.value });

    const { result } = renderHook(() => useOperationMetricsQuery('svc', baseParams), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.serviceOpsMetrics![0].requests).toBe(100);
    expect(result.current.data!.opsError).toEqual({
      opsLatencies: { message: failure.message },
      opsCalls: null,
      opsErrors: null,
    });
    expect(jaegerClient.fetchMetrics).toHaveBeenCalledTimes(3);
  });

  it('passes groupByOperation: true and endTs from params for all three calls', async () => {
    vi.mocked(jaegerClient.fetchMetrics).mockResolvedValue({
      name: 'service_operation_latencies',
      type: 'GAUGE',
      help: '',
      quantile: 0.95,
      metrics: [],
    });

    const { result } = renderHook(() => useOperationMetricsQuery('svc', baseParams), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    for (const call of vi.mocked(jaegerClient.fetchMetrics).mock.calls) {
      expect(call[2]).toMatchObject({ groupByOperation: true, endTs: baseParams.endTs });
    }
  });
});

describe.each([
  { queryKey: 'serviceMetrics', useMetrics: useServiceMetricsQuery, count: 5 },
  { queryKey: 'operationMetrics', useMetrics: useOperationMetricsQuery, count: 3 },
])('$queryKey cancellation and caching', ({ queryKey, useMetrics, count }) => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    vi.mocked(jaegerClient.fetchMetrics).mockReset();
    vi.mocked(jaegerClient.fetchMetrics).mockImplementation(
      (_type, _service, _query, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
        })
    );
  });

  afterEach(() => qc.clear());

  it('keeps previous data while a key change aborts the abandoned request group', async () => {
    const cached =
      queryKey === 'serviceMetrics'
        ? transformServiceMetrics(nameServiceResults(fullServicePayload))
        : transformOperationMetrics(nameOperationResults(fullOpsPayload));
    qc.setQueryData([queryKey, 'svc', baseParams], cached);
    const { result, rerender, unmount } = renderHook(({ params }) => useMetrics('svc', params), {
      wrapper: makeWrapper(qc),
      initialProps: { params: baseParams },
    });

    expect(result.current.data).toEqual(cached);
    expect(jaegerClient.fetchMetrics).not.toHaveBeenCalled();

    rerender({ params: { ...baseParams, endTs: baseParams.endTs + 1 } });
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data).toEqual(cached);
    expect(jaegerClient.fetchMetrics).toHaveBeenCalledTimes(count);
    const signals = vi.mocked(jaegerClient.fetchMetrics).mock.calls.map(call => call[3]);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals.every(signal => signal === signals[0] && !signal?.aborted)).toBe(true);

    rerender({ params: { ...baseParams, endTs: baseParams.endTs + 2 } });
    expect(signals.every(signal => signal?.aborted)).toBe(true);
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data).toEqual(cached);
    expect(result.current.isError).toBe(false);
    expect(jaegerClient.fetchMetrics).toHaveBeenCalledTimes(count * 2);
    const currentSignals = vi
      .mocked(jaegerClient.fetchMetrics)
      .mock.calls.slice(count)
      .map(call => call[3]);
    expect(currentSignals.every(signal => signal && !signal.aborted)).toBe(true);

    const currentKey = [queryKey, 'svc', { ...baseParams, endTs: baseParams.endTs + 2 }];
    const query = qc.getQueryCache().find({ queryKey: currentKey });
    expect(query?.state.fetchStatus).toBe('fetching');
    const pending = query?.promise;
    unmount();
    expect(currentSignals.every(signal => signal?.aborted)).toBe(true);
    await act(async () => {
      await pending?.catch(() => undefined);
    });
    // Retain the query so garbage collection cannot hide an all-error payload.
    expect(qc.getQueryCache().find({ queryKey: currentKey })).toBe(query);
    expect(qc.getQueryState(currentKey)).toMatchObject({ fetchStatus: 'idle', data: undefined });
  });

  it('rejects an aborted query function with the original reason', async () => {
    const { unmount } = renderHook(() => useMetrics('svc', baseParams), { wrapper: makeWrapper(qc) });
    const query = qc.getQueryCache().find({ queryKey: [queryKey, 'svc', baseParams] });
    const queryFn = query?.options.queryFn;
    if (!query || typeof queryFn !== 'function') throw new Error('Expected a metrics query function');
    const controller = new AbortController();
    const reason = new Error('metrics group abandoned');
    // Exercise the function itself, before React Query can discard its result.
    const pending = queryFn({
      client: qc,
      queryKey: query.queryKey,
      signal: controller.signal,
      meta: undefined,
    });
    controller.abort(reason);
    await expect(pending).rejects.toBe(reason);
    unmount();
  });

  it('keeps shared requests alive until the last observer unmounts', () => {
    const first = renderHook(() => useMetrics('svc', baseParams), { wrapper: makeWrapper(qc) });
    const second = renderHook(() => useMetrics('svc', baseParams), { wrapper: makeWrapper(qc) });
    expect(jaegerClient.fetchMetrics).toHaveBeenCalledTimes(count);
    const signals = vi.mocked(jaegerClient.fetchMetrics).mock.calls.map(call => call[3]);
    expect(signals.every(signal => signal instanceof AbortSignal && !signal.aborted)).toBe(true);

    first.unmount();
    expect(signals.every(signal => signal && !signal.aborted)).toBe(true);
    second.unmount();
    expect(signals.every(signal => signal?.aborted)).toBe(true);
  });
});
