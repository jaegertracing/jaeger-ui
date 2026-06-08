// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import JaegerAPI from '../api/jaeger';
import {
  transformServiceMetrics,
  transformOperationMetrics,
  useServiceMetricsQuery,
  useOperationMetricsQuery,
} from './useMetricsQuery';
import type {
  FetchedAllServiceMetricsResponse,
  FetchAggregatedServiceMetricsResponse,
} from '../types/metrics';

vi.mock('../api/jaeger', () => ({
  default: {
    fetchMetrics: vi.fn(),
  },
}));

const metricPoint = { gaugeValue: { doubleValue: 100 }, timestamp: '2021-09-10T11:00:00.000Z' };

// PromiseStatus is an unexported enum, so cast via `any` to avoid string-vs-enum errors.
const latency50 = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.5,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} as any as FetchedAllServiceMetricsResponse[0];
const latency75 = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.75,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} as any as FetchedAllServiceMetricsResponse[1];
const latency95 = {
  status: 'fulfilled',
  value: {
    name: 'service_latencies' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} as any as FetchedAllServiceMetricsResponse[2];
const callRate = {
  status: 'fulfilled',
  value: {
    name: 'service_call_rate' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} as any as FetchedAllServiceMetricsResponse[3];
const errorRate = {
  status: 'fulfilled',
  value: {
    name: 'service_error_rate' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'service_name', value: 'svc' }], metricPoints: [metricPoint] }],
  },
} as any as FetchedAllServiceMetricsResponse[4];

const fullServicePayload: FetchedAllServiceMetricsResponse = [
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
} as any as FetchAggregatedServiceMetricsResponse[0];
const opsCalls = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_call_rate' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'operation', value: 'op1' }], metricPoints: [metricPoint] }],
  },
} as any as FetchAggregatedServiceMetricsResponse[1];
const opsErrors = {
  status: 'fulfilled',
  value: {
    name: 'service_operation_error_rate' as const,
    type: 'GAUGE',
    help: '',
    quantile: 0.95,
    metrics: [{ labels: [{ name: 'operation', value: 'op1' }], metricPoints: [metricPoint] }],
  },
} as any as FetchAggregatedServiceMetricsResponse[2];

const fullOpsPayload: FetchAggregatedServiceMetricsResponse = [opsLatencies, opsCalls, opsErrors];

describe('transformServiceMetrics', () => {
  it('populates service_latencies array from fulfilled results', () => {
    const result = transformServiceMetrics(fullServicePayload);
    expect(result.serviceMetrics.service_latencies).toHaveLength(3);
    expect(result.serviceMetrics.service_latencies![0].quantile).toBe(0.5);
    expect(result.serviceMetrics.service_latencies![1].quantile).toBe(0.75);
    expect(result.serviceMetrics.service_latencies![2].quantile).toBe(0.95);
  });

  it('populates service_call_rate and service_error_rate', () => {
    const result = transformServiceMetrics(fullServicePayload);
    expect(result.serviceMetrics.service_call_rate).not.toBeNull();
    expect(result.serviceMetrics.service_error_rate).not.toBeNull();
  });

  it('clears all errors when all promises are fulfilled', () => {
    const result = transformServiceMetrics(fullServicePayload);
    expect(result.serviceError.service_latencies_50).toBeNull();
    expect(result.serviceError.service_latencies_75).toBeNull();
    expect(result.serviceError.service_latencies_95).toBeNull();
    expect(result.serviceError.service_call_rate).toBeNull();
    expect(result.serviceError.service_error_rate).toBeNull();
  });

  it('records per-slot errors when promises are rejected', () => {
    const fakeErr = new Error('timeout') as any;
    const mixed = [
      { status: 'rejected', reason: fakeErr },
      { status: 'rejected', reason: fakeErr },
      { status: 'rejected', reason: fakeErr },
      { status: 'rejected', reason: fakeErr },
      { status: 'rejected', reason: fakeErr },
    ] as any as FetchedAllServiceMetricsResponse;
    const result = transformServiceMetrics(mixed);
    expect(result.serviceError.service_latencies_50).toBe(fakeErr);
    expect(result.serviceError.service_latencies_75).toBe(fakeErr);
    expect(result.serviceError.service_latencies_95).toBe(fakeErr);
    expect(result.serviceError.service_call_rate).toBe(fakeErr);
    expect(result.serviceError.service_error_rate).toBe(fakeErr);
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
    ] as any as FetchedAllServiceMetricsResponse;
    const result = transformServiceMetrics(payload);
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
    ] as any as FetchedAllServiceMetricsResponse;
    const result = transformServiceMetrics(payload);
    const latency = result.serviceMetrics.service_latencies![0];
    // NaN point becomes null, good point becomes 50
    expect(latency.metricPoints[0].y).toBeNull();
    expect(latency.metricPoints[1].y).toBe(50);
    // max should reflect only the valid point, not NaN
    expect(latency.max).toBe(50);
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
    ] as any as FetchedAllServiceMetricsResponse;
    const result = transformServiceMetrics(empty);
    expect(result.serviceMetrics.service_latencies).toBeNull();
    expect(result.serviceMetrics.service_call_rate).toBeNull();
  });
});

describe('transformOperationMetrics', () => {
  it('produces one ServiceOpsMetrics entry per operation', () => {
    const result = transformOperationMetrics(fullOpsPayload);
    expect(result.serviceOpsMetrics).toHaveLength(1);
    expect(result.serviceOpsMetrics![0].name).toBe('op1');
  });

  it('sets impact to 1 when there is exactly one operation', () => {
    const result = transformOperationMetrics(fullOpsPayload);
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
    ] as any as FetchAggregatedServiceMetricsResponse;
    const result = transformOperationMetrics(payload);
    const impacts = result.serviceOpsMetrics!.map(m => m.impact);
    expect(Math.max(...impacts)).toBe(1);
    expect(Math.min(...impacts)).toBe(0);
  });

  it('records per-slot errors when ops promises are rejected', () => {
    const fakeErr = new Error('net') as any;
    const payload = [
      { status: 'rejected', reason: fakeErr },
      { status: 'rejected', reason: fakeErr },
      { status: 'rejected', reason: fakeErr },
    ] as any as FetchAggregatedServiceMetricsResponse;
    const result = transformOperationMetrics(payload);
    expect(result.opsError.opsLatencies).toBe(fakeErr);
    expect(result.opsError.opsCalls).toBe(fakeErr);
    expect(result.opsError.opsErrors).toBe(fakeErr);
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
    ] as any as FetchAggregatedServiceMetricsResponse;
    const result = transformOperationMetrics(empty);
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
  quantile: 0.95,
  endTs: 1000,
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
    expect(JaegerAPI.fetchMetrics).not.toHaveBeenCalled();
  });

  it('does not call the API when params are undefined', () => {
    const { result } = renderHook(() => useServiceMetricsQuery('svc', undefined), {
      wrapper: makeWrapper(qc),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(JaegerAPI.fetchMetrics).not.toHaveBeenCalled();
  });

  it('fetches and transforms service metrics', async () => {
    vi.mocked(JaegerAPI.fetchMetrics)
      .mockResolvedValueOnce({ ...(latency50 as any).value })
      .mockResolvedValueOnce({ ...(latency75 as any).value })
      .mockResolvedValueOnce({ ...(latency95 as any).value })
      .mockResolvedValueOnce({ ...(callRate as any).value })
      .mockResolvedValueOnce({ ...(errorRate as any).value });

    const { result } = renderHook(() => useServiceMetricsQuery('svc', baseParams), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JaegerAPI.fetchMetrics).toHaveBeenCalledTimes(5);
    expect(result.current.data!.serviceMetrics.service_latencies).toHaveLength(3);
    expect(result.current.data!.serviceError.service_latencies_50).toBeNull();
  });

  it('passes quantile overrides for the three latency calls', async () => {
    vi.mocked(JaegerAPI.fetchMetrics).mockResolvedValue({
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
    const calls = vi.mocked(JaegerAPI.fetchMetrics).mock.calls;
    expect(calls[0][2]).toMatchObject({ quantile: 0.5 });
    expect(calls[1][2]).toMatchObject({ quantile: 0.75 });
    expect(calls[2][2]).toMatchObject({ quantile: 0.95 });
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
    expect(JaegerAPI.fetchMetrics).not.toHaveBeenCalled();
  });

  it('fetches and transforms operation metrics', async () => {
    vi.mocked(JaegerAPI.fetchMetrics)
      .mockResolvedValueOnce({ ...(opsLatencies as any).value })
      .mockResolvedValueOnce({ ...(opsCalls as any).value })
      .mockResolvedValueOnce({ ...(opsErrors as any).value });

    const { result } = renderHook(() => useOperationMetricsQuery('svc', baseParams), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JaegerAPI.fetchMetrics).toHaveBeenCalledTimes(3);
    expect(result.current.data!.serviceOpsMetrics).toHaveLength(1);
    expect(result.current.data!.serviceOpsMetrics![0].name).toBe('op1');
  });

  it('passes groupByOperation: true for all three calls', async () => {
    vi.mocked(JaegerAPI.fetchMetrics).mockResolvedValue({
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
    for (const call of vi.mocked(JaegerAPI.fetchMetrics).mock.calls) {
      expect(call[2]).toMatchObject({ groupByOperation: true });
    }
  });
});
