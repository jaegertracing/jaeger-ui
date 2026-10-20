// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { JaegerClient, jaegerClient } from './client';
import { ZodError } from 'zod';
import { ALL_SERVICES } from '../../constants/search-form';

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

  describe.each(['fetchDependencies', 'fetchDeepDependencyGraph'] as const)('%s', method => {
    const fetchGraph = () =>
      method === 'fetchDependencies'
        ? client.fetchDependencies(100, 200)
        : client.fetchDeepDependencyGraph({ service: 'frontend', start: 100, end: 200 });

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

  describe('fetchWithTimeout', () => {
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

      const promise = client['fetchWithTimeout']('/test', { timeout: 1000, signal: caller.signal });
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

      const promise = client['fetchWithTimeout']('/test', { timeout: 1000, signal: caller.signal });
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
        client['fetchWithTimeout']('/test', { timeout: 1000, signal: caller.signal })
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
    vi.doUnmock('../../site-prefix');
  });
});
