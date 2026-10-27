// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { JaegerClient, jaegerClient } from './client';
import { ZodError } from 'zod';
import { ALL_SERVICES } from '../../constants/search-form';
import { MAX_DETAIL_LENGTH } from '../../utils/error-message';

describe('JaegerClient', () => {
  let client: JaegerClient;
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    client = new JaegerClient();
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    (global as any).fetch = mockFetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    vi.useRealTimers();
  });

  describe('fetchMetrics', () => {
    const query = {
      endTs: 1_700_000_000_000,
      lookback: 3600000,
      step: 60000,
      ratePer: 600000,
      spanKind: 'server' as const,
      quantile: 0.95,
    };

    it('encodes the service and preserves operation query parameters in milliseconds', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'service_operation_latencies', type: 'GAUGE', help: '', metrics: [] }),
      });

      await client.fetchMetrics('latencies', 'frontend /?&=+#', { ...query, groupByOperation: true });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/metrics/latencies?service=frontend%20%2F%3F%26%3D%2B%23&endTs=1700000000000&groupByOperation=true&lookback=3600000&quantile=0.95&ratePer=600000&spanKind=server&step=60000',
        { signal: undefined }
      );
    });

    it.each(['latencies', 'calls', 'errors'] as const)(
      'preserves the %s response and overrides its quantile with the requested value',
      async metricType => {
        const data = {
          name: 'service_latencies',
          type: 'GAUGE',
          help: '',
          metrics: [],
          quantile: 0.1,
          extra: 'retained',
        };
        mockFetch.mockResolvedValue({ ok: true, json: async () => data });

        await expect(client.fetchMetrics(metricType, 'frontend', query)).resolves.toEqual({
          ...data,
          quantile: 0.95,
        });
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/metrics/${metricType}?service=frontend&`),
          { signal: undefined }
        );
      }
    );

    it('preserves HTTP 501 details from the shared transport', async () => {
      const body = { errors: [{ code: 501, msg: 'metrics querying is currently disabled' }] };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(body), { status: 501, statusText: 'Not Implemented' })
      );

      await expect(client.fetchMetrics('calls', 'frontend', query)).rejects.toMatchObject({
        message: 'Failed to fetch calls metrics: 501 Not Implemented: metrics querying is currently disabled',
        httpStatus: 501,
        httpStatusText: 'Not Implemented',
        httpBody: JSON.stringify(body, null, 2),
        httpUrl: '/api/metrics/calls',
        httpQuery: expect.stringContaining('service=frontend&endTs=1700000000000'),
      });
    });

    it('accepts omitted empty protobuf fields and retains unknown metadata', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'service_call_rate', type: 'GAUGE', extra: 'retained' }),
      });
      await expect(client.fetchMetrics('calls', 'frontend', query)).resolves.toEqual({
        name: 'service_call_rate',
        type: 'GAUGE',
        help: '',
        metrics: [],
        extra: 'retained',
        quantile: 0.95,
      });
    });

    it('validates operation points and decodes protobuf non-finite doubles', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          name: 'service_operation_latencies',
          type: 'GAUGE',
          metrics: [
            {
              labels: [{ name: 'operation' }],
              metricPoints: ['NaN', 'Infinity', '-Infinity', 0].map(doubleValue => ({
                gaugeValue: { doubleValue, extra: 'retained' },
                timestamp: '2026-10-27T00:00:00Z',
              })),
            },
            {},
          ],
        }),
      });
      const response = await client.fetchMetrics('latencies', 'frontend', {
        ...query,
        groupByOperation: true,
      });
      expect(response.metrics[0].labels).toEqual([{ name: 'operation', value: '' }]);
      expect(response.metrics[0].metricPoints.map(point => point.gaugeValue.doubleValue)).toEqual([
        NaN,
        Infinity,
        -Infinity,
        0,
      ]);
      expect(response.metrics[0].metricPoints[0].gaugeValue).toHaveProperty('extra', 'retained');
      expect(response.metrics[1]).toEqual({ labels: [], metricPoints: [] });
    });

    it('validates populated service metrics without requiring a server quantile', async () => {
      const data = {
        name: 'service_latencies',
        type: 'GAUGE',
        metrics: [
          {
            labels: [{ name: 'service_name', value: 'frontend' }],
            metricPoints: [{ gaugeValue: { doubleValue: 0 }, timestamp: '2026-10-27T00:00:00Z' }],
          },
        ],
      };
      mockFetch.mockResolvedValue({ ok: true, json: async () => data });
      await expect(client.fetchMetrics('latencies', 'frontend', query)).resolves.toEqual({
        ...data,
        help: '',
        quantile: query.quantile,
      });
    });

    it.each([
      null,
      { type: 'GAUGE' },
      { name: 'service_call_rate', type: 'GAUGE', metrics: 'invalid' },
      { name: 'service_call_rate', type: 'COUNTER', metrics: [] },
      { name: 'service_call_rate', type: 'GAUGE', metrics: [{}] },
      { name: 'service_call_rate', type: 'GAUGE', metrics: [{ labels: [{ name: 1, value: 'svc' }] }] },
      {
        name: 'service_call_rate',
        type: 'GAUGE',
        metrics: [
          {
            labels: [{ name: 'service_name', value: 'svc' }],
            metricPoints: [
              {
                gaugeValue: { doubleValue: 'invalid' },
                timestamp: '2026-10-27T00:00:00Z',
              },
            ],
          },
        ],
      },
      { name: 'service_operation_call_rate', type: 'GAUGE', metrics: [] },
    ])('rejects malformed or incorrectly grouped service metrics: %j', async data => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => data });
      await expect(client.fetchMetrics('calls', 'frontend', query)).rejects.toThrow(ZodError);
    });

    it('rejects service metrics for an operation query', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'service_call_rate', type: 'GAUGE' }),
      });
      await expect(
        client.fetchMetrics('calls', 'frontend', { ...query, groupByOperation: true })
      ).rejects.toThrow(ZodError);
    });

    it('allows successful headers and bodies to arrive after the default transport deadline', async () => {
      const data = { name: 'service_call_rate', type: 'GAUGE', help: '', metrics: [] };
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(
              () =>
                resolve({ ok: true, json: () => new Promise(done => setTimeout(() => done(data), 11000)) }),
              11000
            );
          })
      );

      const promise = client.fetchMetrics('calls', 'frontend', query);
      await vi.advanceTimersByTimeAsync(22000);

      await expect(promise).resolves.toEqual({ ...data, quantile: query.quantile });
      expect(vi.getTimerCount()).toBe(0);
    });

    it('forwards cancellation and preserves the caller abort reason', async () => {
      const controller = new AbortController();
      const reason = new Error('metrics query abandoned');
      mockFetch.mockImplementation(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
          })
      );

      const promise = client.fetchMetrics('errors', 'frontend', query, controller.signal);
      controller.abort(reason);

      await expect(promise).rejects.toBe(reason);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal });
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe.each(['fetchDependencies', 'fetchDeepDependencyGraph'] as const)('%s', method => {
    const fetchGraph = (signal?: AbortSignal) =>
      method === 'fetchDependencies'
        ? client.fetchDependencies(100, 200, signal)
        : client.fetchDeepDependencyGraph({ service: 'frontend', start: 100, end: 200 }, signal);

    it.each([{ data: [] }, [], null, { dependencies: [] }])(
      'preserves the JSON response for hook normalization: %j',
      async data => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => data });

        await expect(fetchGraph()).resolves.toBe(data);
      }
    );

    it('reports HTTP failures with the client error style', async () => {
      const json = vi.fn();
      mockFetch.mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable', json });
      const operation = method === 'fetchDependencies' ? 'dependencies' : 'deep dependencies';

      await expect(fetchGraph()).rejects.toThrow(`Failed to fetch ${operation}: 503 Service Unavailable`);
      expect(json).not.toHaveBeenCalled();
    });

    it('propagates network failures', async () => {
      const failure = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValue(failure);

      await expect(fetchGraph()).rejects.toBe(failure);
    });

    it('propagates invalid JSON responses', async () => {
      const failure = new SyntaxError('Unexpected token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw failure;
        },
      });

      await expect(fetchGraph()).rejects.toBe(failure);
    });

    it('preserves graph reads that take longer than the default transport deadline', async () => {
      const data = { dependencies: [] };
      let finishRequest!: (response: unknown) => void;
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve => {
            finishRequest = resolve;
          })
      );

      const promise = fetchGraph();
      await vi.advanceTimersByTimeAsync(11000);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), { signal: undefined });
      expect(vi.getTimerCount()).toBe(0);
      finishRequest({ ok: true, json: async () => data });
      await expect(promise).resolves.toBe(data);
    });

    it('forwards the caller signal without adding a deadline', async () => {
      const controller = new AbortController();
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

      await fetchGraph(controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal });
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  it('uses a one-week default lookback for dependency requests', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });

    await client.fetchDependencies(100);

    expect(mockFetch).toHaveBeenCalledWith('/api/dependencies?endTs=100&lookback=604800000', {
      signal: undefined,
    });
  });

  it('preserves deep-dependency query encoding and omits an absent operation', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ dependencies: [] }) });

    await client.fetchDeepDependencyGraph({ service: 'frontend /?&=!', start: 0, end: 200 });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/deep-dependencies?end=200&service=frontend%20%2F%3F%26%3D%21&start=0',
      { signal: undefined }
    );
  });

  describe('archiveTrace', () => {
    it('POSTs to the existing archive endpoint through the timeout transport', async () => {
      const data = { data: [] };
      mockFetch.mockResolvedValue({ ok: true, json: async () => data });

      await expect(client.archiveTrace('trace-id')).resolves.toBe(data);
      expect(mockFetch).toHaveBeenCalledWith('/api/archive/trace-id', {
        method: 'POST',
        signal: expect.any(AbortSignal),
      });
    });

    it('reports archive HTTP failures with the v3 error style', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(client.archiveTrace('trace-id')).rejects.toThrow(
        'Failed to archive trace trace-id: 403 Forbidden'
      );
    });
  });

  describe('fetchDecoration', () => {
    it.each([null, false, 0, ''])('preserves arbitrary JSON response %j', async data => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => data });

      await expect(client.fetchDecoration('/details')).resolves.toBe(data);
    });

    it('preserves array-valued decoration responses', async () => {
      const data = ['decoration'];
      mockFetch.mockResolvedValue({ ok: true, json: async () => data });

      await expect(client.fetchDecoration('/details')).resolves.toBe(data);
    });

    it.each(['foo.bar.baz', 'https://decorations.example/details?service=frontend'])(
      'GETs the configured URL unchanged: %s',
      async url => {
        const data = { details: { calls: 42 } };
        mockFetch.mockResolvedValue({ ok: true, json: async () => data });

        await expect(client.fetchDecoration(url)).resolves.toBe(data);
        expect(mockFetch).toHaveBeenCalledWith(url, { signal: expect.any(AbortSignal) });
      }
    );

    it('reports decoration HTTP failures with the v3 error style', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      });

      await expect(client.fetchDecoration('/details')).rejects.toThrow(
        'Failed to fetch decoration: 502 Bad Gateway'
      );
    });
  });

  describe.each(['archiveTrace', 'fetchDecoration'] as const)('%s transport failures', method => {
    it('aborts after the shared 10-second timeout and clears the timer', async () => {
      let requestSignal: AbortSignal | undefined;
      mockFetch.mockImplementation(
        (_url: string, { signal }: RequestInit) =>
          new Promise((_resolve, reject) => {
            requestSignal = signal!;
            signal!.addEventListener('abort', () => {
              const error = new Error('Aborted');
              error.name = 'AbortError';
              reject(error);
            });
          })
      );

      const promise = client[method]('/details').catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(9999);
      expect(requestSignal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await promise).toMatchObject({ message: 'Request timeout after 10000ms' });
      expect(requestSignal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('propagates network failures and clears the timer', async () => {
      const failure = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValue(failure);

      await expect(client[method]('/details')).rejects.toBe(failure);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('propagates invalid JSON responses', async () => {
      const failure = new SyntaxError('Unexpected token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw failure;
        },
      });

      await expect(client[method]('/details')).rejects.toBe(failure);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('fetchQualityMetrics', () => {
    it('GETs the configured endpoint with the encoded service and lookback hours', async () => {
      const data = { scores: [], metrics: [], extra: 'retained' };
      mockFetch.mockResolvedValue({ ok: true, json: async () => data });

      await expect(client.fetchQualityMetrics('frontend /?&=+#', 48)).resolves.toBe(data);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/quality-metrics?hours=48&service=frontend%20%2F%3F%26%3D%2B%23',
        { signal: undefined }
      );
    });

    it('preserves HTTP error details for ErrorMessage', async () => {
      const body = { error: 'quality metrics unavailable' };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(body), { status: 503, statusText: 'Service Unavailable' })
      );

      await expect(client.fetchQualityMetrics('frontend', 48)).rejects.toMatchObject({
        message: 'Failed to fetch quality metrics: 503 Service Unavailable',
        httpStatus: 503,
        httpStatusText: 'Service Unavailable',
        httpBody: JSON.stringify(body, null, 2),
        httpUrl: '/api/quality-metrics',
        httpQuery: 'hours=48&service=frontend',
      });
    });

    it('allows successful headers and bodies to arrive after the default transport deadline', async () => {
      const data = { scores: [], metrics: [] };
      mockFetch.mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(
              () =>
                resolve({ ok: true, json: () => new Promise(done => setTimeout(() => done(data), 11000)) }),
              11000
            );
          })
      );

      const promise = client.fetchQualityMetrics('frontend', 48);
      await vi.advanceTimersByTimeAsync(22000);

      await expect(promise).resolves.toBe(data);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('forwards cancellation and preserves the caller abort reason', async () => {
      const controller = new AbortController();
      const reason = new Error('quality metrics query abandoned');
      mockFetch.mockImplementation(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
          })
      );

      const promise = client.fetchQualityMetrics('frontend', 48, controller.signal);
      controller.abort(reason);

      await expect(promise).rejects.toBe(reason);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal });
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('fetchServices', () => {
    it('successfully fetches and returns service list', async () => {
      const mockServices = ['service-a', 'service-b', 'service-c'];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ services: mockServices }),
      });

      const promise = client.fetchServices();
      vi.runAllTimers();
      const result = await promise;

      expect(result).toEqual(mockServices);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v3/services',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('returns empty array when API returns empty services', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ services: [] }),
      });

      const promise = client.fetchServices();
      vi.runAllTimers();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('throws validation error when API returns no services field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const promise = client.fetchServices();
      vi.runAllTimers();

      await expect(promise).rejects.toBeInstanceOf(ZodError);
    });

    it('throws error when response is not OK', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      const promise = client.fetchServices();
      vi.runAllTimers();

      await expect(promise).rejects.toThrow('Failed to fetch services: 500 Internal Server Error');
    });

    it('throws error when response is 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      });

      const promise = client.fetchServices();
      vi.runAllTimers();

      await expect(promise).rejects.toThrow('Failed to fetch services: 404 Not Found');
    });
  });

  describe('fetchSpanNames', () => {
    it('successfully fetches span names for a given service', async () => {
      const mockOperations = [
        { name: 'GET /api/users', spanKind: 'server' },
        { name: 'POST /api/users', spanKind: 'server' },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ operations: mockOperations }),
      });

      const promise = client.fetchSpanNames('test-service');
      vi.runAllTimers();
      const result = await promise;

      expect(result).toEqual(mockOperations);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v3/operations?service=test-service',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('properly encodes service name with special characters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ operations: [] }),
      });

      const promise = client.fetchSpanNames('service with spaces & special=chars');
      vi.runAllTimers();
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v3/operations?service=service%20with%20spaces%20%26%20special%3Dchars',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('returns empty array when API returns empty operations', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ operations: [] }),
      });

      const promise = client.fetchSpanNames('empty-service');
      vi.runAllTimers();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('throws validation error when API returns no operations field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const promise = client.fetchSpanNames('test-service');
      vi.runAllTimers();

      await expect(promise).rejects.toBeInstanceOf(ZodError);
    });

    it('throws error when response is not OK with service name in message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      const promise = client.fetchSpanNames('my-service');
      vi.runAllTimers();

      await expect(promise).rejects.toThrow(
        'Failed to fetch span names for service "my-service": 500 Internal Server Error'
      );
    });
  });

  describe('fetchJson', () => {
    it('successfully completes requests within timeout', async () => {
      const mockResponse = { ok: true, json: async () => ({ services: [] }) };
      mockFetch.mockResolvedValue(mockResponse);

      const promise = client.fetchServices();
      vi.runAllTimers();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('throws validation error when API returns invalid structure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ services: 'not-an-array' }),
      });

      const promise = client.fetchServices();
      vi.runAllTimers();

      await expect(promise).rejects.toBeInstanceOf(ZodError);
    });

    it('aborts and throws timeout error after default timeout (10s)', async () => {
      mockFetch.mockImplementation((url: string, options?: { signal?: AbortSignal }) => {
        return new Promise((resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const abortError = new Error('The operation was aborted');
              abortError.name = 'AbortError';
              reject(abortError);
            });
          }
        });
      });

      const promise = client.fetchServices();
      vi.advanceTimersByTime(10000);

      await expect(promise).rejects.toThrow('Request timeout after 10000ms');
    });

    it('reports a timeout when a request with a caller signal exceeds its deadline', async () => {
      const caller = new AbortController();
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(options.signal?.reason));
        });
      });

      const promise = client['fetchJson']('/test', 'Failed', { timeout: 1000, signal: caller.signal });
      vi.advanceTimersByTime(1000);

      await expect(promise).rejects.toThrow('Request timeout after 1000ms');
      expect(caller.signal.aborted).toBe(false);
    });

    it('preserves caller cancellation for a request with a deadline', async () => {
      const caller = new AbortController();
      const abortError = new DOMException('Caller cancelled request', 'AbortError');
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(options.signal?.reason));
        });
      });

      const promise = client['fetchJson']('/test', 'Failed', { timeout: 1000, signal: caller.signal });
      caller.abort(abortError);
      vi.advanceTimersByTime(1000);

      await expect(promise).rejects.toBe(abortError);
    });

    it('forwards an already cancelled caller signal to a request with a deadline', async () => {
      const caller = new AbortController();
      const abortError = new DOMException('Caller cancelled request', 'AbortError');
      caller.abort(abortError);
      mockFetch.mockImplementation((_url: string, options: RequestInit) => {
        expect(options.signal?.aborted).toBe(true);
        return Promise.reject(options.signal?.reason);
      });

      await expect(
        client['fetchJson']('/test', 'Failed', { timeout: 1000, signal: caller.signal })
      ).rejects.toBe(abortError);
    });

    it('clears timeout after successful request', async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ services: [] }),
      });

      const promise = client.fetchServices();
      vi.runAllTimers();
      await promise;

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('handles network errors that are not timeout-related', async () => {
      const networkError = new Error('Network connection failed');
      mockFetch.mockRejectedValue(networkError);

      const promise = client.fetchServices();
      vi.runAllTimers();

      await expect(promise).rejects.toThrow('Network connection failed');
    });

    it('clears timeout even when request fails', async () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const promise = client.fetchServices();
      vi.runAllTimers();

      await expect(promise).rejects.toThrow('Network error');
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('fetchTraceSummaries', () => {
    const query = {
      service: 'my-svc',
      operation: undefined,
      start: '1700000000000000',
      end: '1700000060000000',
      limit: 20,
      lookback: '1h',
      minDuration: undefined,
      maxDuration: undefined,
      tags: undefined,
    };

    // Wire field is `traceId` (proto3 camelCase), not `traceID`.
    const mockApiSummary = {
      traceId: 'aaaabbbbccccdddd0000111122223333',
      rootServiceName: 'my-svc',
      rootOperationName: 'GET /api',
      // Decimal strings — proto3 JSON encoding for int64
      minStartTimeUnixNano: '1700000001000000000',
      maxEndTimeUnixNano: '1700000001000500000',
      spanCount: 5,
      errorSpanCount: 1,
      orphanSpanCount: 0,
      services: [{ name: 'my-svc', spanCount: 5, errorSpanCount: 1 }],
    };

    it('maps string nanosecond timestamps to microseconds without precision loss', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ summaries: [mockApiSummary] }),
      });

      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();
      const result = await promise;

      expect(result).toHaveLength(1);
      // 1700000001000000000 ns / 1000 = 1700000001000000 µs
      expect(result[0].startTime).toBe(1700000001000000);
      // (1700000001000500000 - 1700000001000000000) / 1000 = 500 µs
      expect(result[0].duration).toBe(500);
    });

    it('builds traceName from rootServiceName and rootOperationName', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ summaries: [mockApiSummary] }),
      });

      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();
      const [summary] = await promise;

      expect(summary.traceName).toBe('my-svc: GET /api');
      // traceId (wire) is mapped to traceID (internal Jaeger convention)
      expect(summary.traceID).toBe(mockApiSummary.traceId);
      expect(summary.spanCount).toBe(5);
      expect(summary.errorSpanCount).toBe(1);
      expect(summary.orphanSpanCount).toBe(0);
      expect(summary.services).toEqual(mockApiSummary.services);
    });

    it('falls back to defaults for all optional fields when absent', async () => {
      // Only traceId is required; everything else including timestamps is optional.
      const minimal = { traceId: 'aaaabbbbccccdddd0000111122223333' };
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [minimal] }) });

      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();
      const [summary] = await promise;

      expect(summary.traceID).toBe(minimal.traceId);
      expect(summary.traceName).toBe('');
      expect(summary.rootServiceName).toBe('');
      expect(summary.rootOperationName).toBe('');
      expect(summary.startTime).toBe(0);
      expect(summary.duration).toBe(0);
      expect(summary.spanCount).toBeUndefined();
      expect(summary.errorSpanCount).toBeUndefined();
      expect(summary.orphanSpanCount).toBeUndefined();
      expect(summary.services).toEqual([]);
    });

    it('clamps duration to 0 when only minStartTimeUnixNano is present', async () => {
      const oneSided = { ...mockApiSummary, maxEndTimeUnixNano: undefined };
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [oneSided] }) });
      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();
      const [summary] = await promise;
      expect(summary.startTime).toBe(1700000001000000);
      expect(summary.duration).toBe(0);
    });

    it('clamps startTime to endTime when only maxEndTimeUnixNano is present', async () => {
      const oneSided = { ...mockApiSummary, minStartTimeUnixNano: undefined };
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [oneSided] }) });
      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();
      const [summary] = await promise;
      // startTime is derived from endNs when start is absent
      expect(summary.startTime).toBe(1700000001000500);
      expect(summary.duration).toBe(0);
    });

    it('builds traceName from rootServiceName only when rootOperationName is absent', async () => {
      const partial = { ...mockApiSummary, rootOperationName: undefined };
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [partial] }) });
      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();
      const [summary] = await promise;
      expect(summary.traceName).toBe('my-svc');
    });

    it('builds traceName from rootOperationName only when rootServiceName is absent', async () => {
      const partial = { ...mockApiSummary, rootServiceName: undefined };
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [partial] }) });
      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();
      const [summary] = await promise;
      expect(summary.traceName).toBe('GET /api');
    });

    it('accepts partial ServiceSummary entries with missing fields', async () => {
      const withPartialService = { ...mockApiSummary, services: [{ name: 'partial-svc' }] };
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [withPartialService] }) });
      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();
      const [summary] = await promise;
      expect(summary.services).toEqual([
        { name: 'partial-svc', spanCount: undefined, errorSpanCount: undefined },
      ]);
    });

    it('throws ZodError when traceId is missing', async () => {
      const { traceId: _omit, ...noTraceId } = mockApiSummary;
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [noTraceId] }) });

      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();
      await expect(promise).rejects.toThrow(ZodError);
    });

    it('throws on non-ok HTTP response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });

      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();

      await expect(promise).rejects.toThrow('Failed to fetch trace summaries: 500 Internal Server Error');
    });

    it('throws ZodError when minStartTimeUnixNano is not a decimal string', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ summaries: [{ ...mockApiSummary, minStartTimeUnixNano: 12345 }] }),
      });

      const promise = client.fetchTraceSummaries(query);
      vi.runAllTimers();

      await expect(promise).rejects.toThrow(ZodError);
    });

    it('only sets URL params for non-null query fields', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [] }) });

      const promise = client.fetchTraceSummaries({
        ...query,
        operation: 'GET /api',
        tags: 'http.status=200',
      });
      vi.runAllTimers();
      await promise;

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('query.serviceName=my-svc');
      expect(calledUrl).toContain('query.operationName=GET+%2Fapi');
      expect(calledUrl).toContain('query.attributes=http.status%3D200');
      expect(calledUrl).toContain('query.searchDepth=20');
    });

    it('omits the service name for an all-services search', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [] }) });

      const promise = client.fetchTraceSummaries({
        ...query,
        service: ALL_SERVICES,
        tags: 'http.status=500',
      });
      vi.runAllTimers();
      await promise;

      // ALL_SERVICES is a UI-only value; the API reads an absent service name as
      // "any service", so it must not travel to the backend as a literal filter.
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('query.serviceName');
      expect(calledUrl).toContain('query.attributes=http.status%3D500');
    });

    it('omits startTimeMin when start timestamp is out of JavaScript Date range', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [] }) });

      const promise = client.fetchTraceSummaries({
        ...query,
        start: '100000000000000000000',
      });
      vi.runAllTimers();
      await expect(promise).resolves.toEqual([]);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('query.startTimeMin');
      expect(calledUrl).toContain('query.startTimeMax');
    });

    it('omits startTimeMax when end timestamp is out of JavaScript Date range', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [] }) });

      const promise = client.fetchTraceSummaries({
        ...query,
        end: '100000000000000000000',
      });
      vi.runAllTimers();
      await expect(promise).resolves.toEqual([]);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('query.startTimeMin');
      expect(calledUrl).not.toContain('query.startTimeMax');
    });

    it('omits timestamps when values are non-numeric or non-positive', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ summaries: [] }) });

      const promise = client.fetchTraceSummaries({
        ...query,
        start: 'invalid-time',
        end: '-100',
      });
      vi.runAllTimers();
      await expect(promise).resolves.toEqual([]);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('query.startTimeMin');
      expect(calledUrl).not.toContain('query.startTimeMax');
    });
  });

  describe('HTTP error details', () => {
    const traceId = '0123456789abcdef0123456789abcdef';
    const failure = (body: BodyInit | null) => new Response(body, { status: 400, statusText: 'Bad Request' });

    const v3Body = { error: { httpCode: 400, message: 'invalid service name' } };
    const legacyBody = { data: null, errors: [{ code: 400, msg: 'invalid service name' }] };

    it.each([
      {
        method: 'fetchDependencies',
        call: () => client.fetchDependencies(100, 200),
        body: legacyBody,
        httpUrl: '/api/dependencies',
        httpQuery: 'endTs=100&lookback=200',
      },
      {
        method: 'fetchDeepDependencyGraph',
        call: () => client.fetchDeepDependencyGraph({ service: 'frontend', start: 100, end: 200 }),
        body: legacyBody,
        httpUrl: '/api/deep-dependencies',
        httpQuery: 'end=200&service=frontend&start=100',
      },
      {
        method: 'archiveTrace',
        call: () => client.archiveTrace(traceId),
        body: legacyBody,
        httpUrl: `/api/archive/${traceId}`,
      },
      {
        method: 'fetchServices',
        call: () => client.fetchServices(),
        body: v3Body,
        httpUrl: '/api/v3/services',
      },
      {
        method: 'fetchSpanNames',
        call: () => client.fetchSpanNames('my svc'),
        body: v3Body,
        httpUrl: '/api/v3/operations',
        httpQuery: 'service=my%20svc',
      },
      {
        method: 'fetchTraceSummaries',
        call: () =>
          client.fetchTraceSummaries({ service: 'my-svc' } as Parameters<
            JaegerClient['fetchTraceSummaries']
          >[0]),
        body: v3Body,
        httpUrl: '/api/v3/trace-summaries',
        httpQuery: 'query.serviceName=my-svc',
      },
      {
        method: 'fetchTrace',
        call: () => client.fetchTrace(traceId),
        body: v3Body,
        httpUrl: `/api/v3/traces/${traceId}`,
      },
    ])(
      '$method attaches the status, URL, query, and formatted JSON body',
      async ({ call, body, httpUrl, httpQuery }) => {
        mockFetch.mockResolvedValue(failure(JSON.stringify(body)));

        const error = await call().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/: 400 Bad Request: invalid service name$/);
        expect({ ...(error as object) }).toEqual({
          httpStatus: 400,
          httpStatusText: 'Bad Request',
          httpUrl,
          ...(httpQuery && { httpQuery }),
          httpBody: JSON.stringify(body, null, 2),
        });
      }
    );

    it('fetchDecoration attaches the status, URL, query, and body without a server message', async () => {
      mockFetch.mockResolvedValue(failure(JSON.stringify(v3Body)));

      const error = await client.fetchDecoration('/details?id=1').catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Failed to fetch decoration: 400 Bad Request');
      expect({ ...(error as object) }).toEqual({
        httpStatus: 400,
        httpStatusText: 'Bad Request',
        httpUrl: '/details',
        httpQuery: 'id=1',
        httpBody: JSON.stringify(v3Body, null, 2),
      });
    });

    it('includes the v3 gateway reason when a trace is not found', async () => {
      const body = { error: { httpCode: 404, message: 'No traces found' } };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(body), { status: 404, statusText: 'Not Found' })
      );

      await expect(client.fetchTrace(traceId)).rejects.toMatchObject({
        message: `Failed to fetch trace ${traceId}: 404 Not Found: No traces found`,
        httpStatus: 404,
        httpUrl: `/api/v3/traces/${traceId}`,
        httpBody: JSON.stringify(body, null, 2),
      });
    });

    it('keeps a non-JSON body as text', async () => {
      mockFetch.mockResolvedValue(failure('storage unavailable'));

      await expect(client.fetchServices()).rejects.toMatchObject({
        message: 'Failed to fetch services: 400 Bad Request',
        httpBody: 'storage unavailable',
      });
    });

    it.each([
      {
        case: 'a padded gateway message',
        body: JSON.stringify({ error: { httpCode: 404, message: '  No traces found\n' } }),
        detail: 'No traces found',
      },
      {
        case: 'a long gateway message, truncated',
        body: JSON.stringify({ error: { message: 'x'.repeat(2000) } }),
        detail: `${'x'.repeat(MAX_DETAIL_LENGTH - 3)}...`,
      },
      {
        case: 'a gateway message at the length limit, intact',
        body: JSON.stringify({ error: { message: 'x'.repeat(MAX_DETAIL_LENGTH) } }),
        detail: 'x'.repeat(MAX_DETAIL_LENGTH),
      },
      { case: 'JSON without a message', body: '{"code":5}' },
      { case: 'an empty gateway message', body: '{"error":{"message":""}}' },
      { case: 'a non-string gateway message', body: '{"error":{"message":404}}' },
      { case: 'a blank gateway message', body: '{"error":{"message":"  "}}' },
      { case: 'a null gateway error', body: '{"error":null}' },
      { case: 'a string gateway error', body: '{"error":"not found"}' },
      { case: 'a legacy envelope on a v3 route', body: '{"errors":[{"code":400,"msg":"legacy"}]}' },
      { case: 'a JSON primitive', body: 'null' },
    ])('appends the v3 gateway message from $case', async ({ body, detail }) => {
      mockFetch.mockResolvedValue(failure(body));

      await expect(client.fetchServices()).rejects.toMatchObject({
        message: `Failed to fetch services: 400 Bad Request${detail ? `: ${detail}` : ''}`,
      });
    });

    it.each([
      {
        case: 'legacy errors',
        body: '{"data":null,"errors":[{"code":400,"msg":"bad start time"},{"code":400,"msg":"bad end time"}]}',
        detail: 'bad start time; bad end time',
      },
      {
        case: 'a padded legacy error',
        body: JSON.stringify({ errors: [{ msg: '  bad start time\n' }] }),
        detail: 'bad start time',
      },
      { case: 'legacy errors without msg', body: '{"errors":[{"code":400}]}' },
      { case: 'legacy errors with a blank msg', body: '{"errors":[{"msg":"  "}]}' },
      { case: 'a null legacy error', body: '{"errors":[null]}' },
      { case: 'a non-array errors field', body: '{"errors":"bad"}' },
      { case: 'a gateway envelope on a legacy route', body: '{"error":{"message":"gateway"}}' },
      { case: 'a JSON primitive', body: 'null' },
    ])('appends the legacy message from $case', async ({ body, detail }) => {
      mockFetch.mockResolvedValue(failure(body));

      await expect(client.archiveTrace(traceId)).rejects.toMatchObject({
        message: `Failed to archive trace ${traceId}: 400 Bad Request${detail ? `: ${detail}` : ''}`,
      });
    });

    it.each([
      { case: 'an empty body', body: () => '' },
      { case: 'a missing body', body: () => null },
      {
        case: 'an unreadable body',
        body: () =>
          new ReadableStream({
            pull(controller) {
              controller.error(new TypeError('network error'));
            },
          }),
      },
    ])('omits the body for $case', async ({ body }) => {
      mockFetch.mockResolvedValue(failure(body()));

      const error = await client.fetchServices().catch((caught: unknown) => caught);

      expect(error).toMatchObject({ message: 'Failed to fetch services: 400 Bad Request', httpStatus: 400 });
      expect(error).not.toHaveProperty('httpBody');
    });

    it('reads at most 4 KB of the body and cancels the rest', async () => {
      const cancel = vi.fn();
      const chunk = new TextEncoder().encode('x'.repeat(1000));
      // An endless body: every pull enqueues another chunk.
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(chunk);
        },
        cancel,
      });
      mockFetch.mockResolvedValue(failure(body));

      const error = await client.fetchServices().catch((caught: unknown) => caught);

      expect((error as { httpBody: string }).httpBody).toBe('x'.repeat(4096));
      expect(cancel).toHaveBeenCalled();
    });

    // The body stream errors with the request's abort reason, as fetch's body does.
    const stalledFailure = (signal: AbortSignal | null | undefined) =>
      failure(
        new ReadableStream({
          start(controller) {
            signal?.addEventListener('abort', () => controller.error(signal.reason));
          },
        })
      );

    it('reports a timeout when the error body outlasts a shorter request deadline', async () => {
      mockFetch.mockImplementation(async (_url: string, options: RequestInit) =>
        stalledFailure(options.signal)
      );

      const promise = client['fetchJson']('/test', 'Failed', { timeout: 1000 }).catch(
        (caught: unknown) => caught
      );
      await vi.advanceTimersByTimeAsync(1000);

      const error = await promise;
      expect(error).toEqual(expect.objectContaining({ message: 'Request timeout after 1000ms' }));
      expect(error).not.toHaveProperty('httpStatus');
    });

    it.each([
      {
        path: 'without a deadline',
        call: () => client.fetchTrace(traceId),
        message: `Failed to fetch trace ${traceId}`,
      },
      {
        path: 'without a deadline',
        call: () => client.fetchDependencies(100, 200),
        message: 'Failed to fetch dependencies',
      },
      { path: 'with a deadline', call: () => client.fetchServices(), message: 'Failed to fetch services' },
    ])('reports the HTTP error when the error body stalls $path ($message)', async ({ call, message }) => {
      const cancel = vi.fn();
      // Sends part of the body, then stalls without closing or erroring.
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('partial'));
        },
        cancel,
      });
      mockFetch.mockResolvedValue(failure(body));

      let settled = false;
      const promise = call()
        .catch((caught: unknown) => caught)
        .finally(() => {
          settled = true;
        });
      await vi.advanceTimersByTimeAsync(1999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);

      const error = await promise;
      expect(error).toMatchObject({
        message: `${message}: 400 Bad Request`,
        httpStatus: 400,
        httpBody: 'partial',
      });
      expect(cancel).toHaveBeenCalled();
    });

    it('omits the body when nothing arrives before the error body deadline', async () => {
      mockFetch.mockImplementation(async (_url: string, options: RequestInit) =>
        stalledFailure(options.signal)
      );

      const promise = client.fetchTrace(traceId).catch((caught: unknown) => caught);
      await vi.advanceTimersByTimeAsync(2000);

      const error = await promise;
      expect(error).toMatchObject({ httpStatus: 400 });
      expect(error).not.toHaveProperty('httpBody');
    });

    it('rethrows caller cancellation during the error body read', async () => {
      const caller = new AbortController();
      const abortError = new DOMException('Caller cancelled request', 'AbortError');
      mockFetch.mockImplementation(async (_url: string, options: RequestInit) =>
        stalledFailure(options.signal)
      );

      const promise = client.fetchTrace(traceId, caller.signal).catch((caught: unknown) => caught);
      await vi.advanceTimersByTimeAsync(0);
      caller.abort(abortError);

      await expect(promise).resolves.toBe(abortError);
    });

    it.each([
      { path: 'without a deadline', call: (signal: AbortSignal) => client.fetchTrace(traceId, signal) },
      {
        path: 'with a deadline',
        call: (signal: AbortSignal) => client['fetchJson']('/test', 'Failed', { timeout: 1000, signal }),
      },
    ])('rethrows a custom cancellation reason during the error body read $path', async ({ call }) => {
      const caller = new AbortController();
      const reason = new Error('navigated away');
      mockFetch.mockImplementation(async (_url: string, options: RequestInit) =>
        stalledFailure(options.signal)
      );

      const promise = call(caller.signal).catch((caught: unknown) => caught);
      await vi.advanceTimersByTimeAsync(0);
      caller.abort(reason);

      await expect(promise).resolves.toBe(reason);
    });

    it('reports a timeout when a successful body outlasts the deadline', async () => {
      mockFetch.mockImplementation(async (_url: string, options: RequestInit) => {
        const signal = options.signal;
        const body = new ReadableStream({
          start(controller) {
            signal?.addEventListener('abort', () => controller.error(signal.reason));
          },
        });
        return new Response(body, { status: 200 });
      });

      const promise = client.fetchServices().catch((caught: unknown) => caught);
      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).resolves.toEqual(
        expect.objectContaining({ message: 'Request timeout after 10000ms' })
      );
    });
  });

  describe('singleton instance', () => {
    it('exports a singleton jaegerClient instance', () => {
      expect(jaegerClient).toBeInstanceOf(JaegerClient);
    });

    it('singleton instance has all expected methods', () => {
      expect(jaegerClient.fetchServices).toBeInstanceOf(Function);
      expect(jaegerClient.fetchSpanNames).toBeInstanceOf(Function);
      expect(jaegerClient.fetchTraceSummaries).toBeInstanceOf(Function);
    });
  });
});

describe('JaegerClient with non-default base path', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    (global as any).fetch = mockFetch;
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    vi.doUnmock('../../site-prefix');
    vi.doUnmock('../../utils/config/get-config');
  });

  it('calls services endpoint with base path prefix from site-prefix', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ services: ['svc-a'] }),
    });

    // Simulate deployment at /jaeger/ by providing a matching site prefix.
    vi.resetModules();
    vi.doMock('../../site-prefix', () => ({ default: `${global.location.origin}/jaeger/` }));
    const { JaegerClient: IsolatedClient } = await import('./client');

    await new IsolatedClient().fetchServices();
    vi.restoreAllMocks();

    expect(mockFetch).toHaveBeenCalledWith(
      '/jaeger/api/v3/services',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('keeps both dependency routes under the deployment base path', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.resetModules();
    vi.doMock('../../site-prefix', () => ({ default: `${global.location.origin}/jaeger/` }));
    const { JaegerClient: IsolatedClient } = await import('./client');
    const client = new IsolatedClient();

    await client.fetchDependencies(100, 200);
    await client.fetchDeepDependencyGraph({ service: 'frontend', operation: '*', start: 100, end: 200 });

    expect(mockFetch).toHaveBeenNthCalledWith(1, '/jaeger/api/dependencies?endTs=100&lookback=200', {
      signal: undefined,
    });
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      '/jaeger/api/deep-dependencies?end=200&operation=%2A&service=frontend&start=100',
      { signal: undefined }
    );
  });

  it('reads the quality-metrics endpoint from config under the deployment base path', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.resetModules();
    vi.doMock('../../site-prefix', () => ({ default: `${global.location.origin}/jaeger/` }));
    vi.doMock('../../utils/config/get-config', () => ({
      default: () => ({ qualityMetrics: { apiEndpoint: '/quality/v2' } }),
    }));
    const { JaegerClient: IsolatedClient } = await import('./client');

    await new IsolatedClient().fetchQualityMetrics('frontend', 48);

    expect(mockFetch).toHaveBeenCalledWith('/jaeger/quality/v2?hours=48&service=frontend', {
      signal: undefined,
    });
  });

  it('keeps metrics under the deployment base path', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'service_call_rate', type: 'GAUGE', help: '', metrics: [] }),
    });
    vi.resetModules();
    vi.doMock('../../site-prefix', () => ({ default: `${global.location.origin}/jaeger/` }));
    const { JaegerClient: IsolatedClient } = await import('./client');

    await new IsolatedClient().fetchMetrics('calls', 'frontend', {
      endTs: 100,
      lookback: 200,
      step: 60,
      ratePer: 600,
      spanKind: 'server',
      quantile: 0.95,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/jaeger/api/metrics/calls?service=frontend&endTs=100&lookback=200&quantile=0.95&ratePer=600&spanKind=server&step=60',
      { signal: undefined }
    );
  });
});
