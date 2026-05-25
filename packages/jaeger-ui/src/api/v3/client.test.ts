// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { JaegerClient, jaegerClient } from './client';
import { ZodError } from 'zod';

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
      expect(summary.spanCount).toBe(0);
      expect(summary.errorSpanCount).toBe(0);
      expect(summary.orphanSpanCount).toBe(0);
      expect(summary.services).toEqual([]);
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
      expect(calledUrl).toContain('query.service_name=my-svc');
      expect(calledUrl).toContain('query.operation_name=GET+%2Fapi');
      expect(calledUrl).toContain('query.attributes=http.status%3D200');
      expect(calledUrl).toContain('query.search_depth=20');
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
});
