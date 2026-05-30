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

  describe('singleton instance', () => {
    it('exports a singleton jaegerClient instance', () => {
      expect(jaegerClient).toBeInstanceOf(JaegerClient);
    });

    it('singleton instance has all expected methods', () => {
      expect(jaegerClient.fetchServices).toBeInstanceOf(Function);
      expect(jaegerClient.fetchSpanNames).toBeInstanceOf(Function);
      expect(jaegerClient.fetchTraceSummaries).toBeInstanceOf(Function);
      expect(jaegerClient.fetchTrace).toBeInstanceOf(Function);
    });
  });

  describe('fetchTraceSummaries', () => {
    it('successfully fetches and maps trace summaries', async () => {
      const mockApiSummaries = [
        {
          traceId: 'trace-1',
          rootServiceName: 'svc-1',
          rootOperationName: 'op-1',
          minStartTimeUnixNano: '1700000000000000000',
          maxEndTimeUnixNano: '1700000000500000000',
          spanCount: 10,
          errorSpanCount: 1,
          orphanSpanCount: 0,
          services: [{ name: 'svc-1', spanCount: 10, errorSpanCount: 1 }],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ summaries: mockApiSummaries }),
      });

      const query = {
        service: 'svc-1',
        operation: 'op-1',
        start: 1700000000000000,
        end: 1700000000500000,
        limit: 20,
        lookback: '1h',
      };

      const result = await client.fetchTraceSummaries(query as any);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        traceID: 'trace-1',
        traceName: 'svc-1: op-1',
        rootServiceName: 'svc-1',
        rootOperationName: 'op-1',
        startTime: 1700000000000000,
        duration: 500000,
        spanCount: 10,
        errorSpanCount: 1,
        orphanSpanCount: 0,
        services: [{ name: 'svc-1', spanCount: 10, errorSpanCount: 1 }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v3/trace-summaries?'),
        expect.anything()
      );
    });

    it('handles missing optional fields in API response', async () => {
      const mockApiSummaries = [
        {
          traceId: 'trace-2',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ summaries: mockApiSummaries }),
      });

      const result = await client.fetchTraceSummaries({} as any);

      expect(result[0]).toEqual(
        expect.objectContaining({
          traceID: 'trace-2',
          traceName: 'trace-2',
          spanCount: 0,
        })
      );
    });

    it('logs error and returns raw transformation when validation fails', async () => {
      const malformedData = { summaries: [{ not_a_trace_id: 'foo' }] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => malformedData,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await client.fetchTraceSummaries({} as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OTLP Validation] Error for trace-summaries response:'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });


  describe('fetchTrace', () => {
    const traceId = '0102030405060708090a0b0c0d0e0f10';
    const mockTraceData = {
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId,
                  spanId: '0102030405060708',
                  name: 'test-span',
                  kind: 1,
                  startTimeUnixNano: '1234567890',
                  endTimeUnixNano: '1234567891',
                  attributes: [],
                },
              ],
            },
          ],
        },
      ],
    };

    it('successfully fetches and validates trace data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTraceData,
      });

      const result = await client.fetchTrace(traceId);

      expect(result).toEqual(mockTraceData);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v3/traces/${traceId}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('logs error and returns raw data when validation fails (safeParse resilience)', async () => {
      const malformedData = { resourceSpans: 'invalid' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => malformedData,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await client.fetchTrace(traceId);

      expect(result).toEqual(malformedData);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[OTLP Validation] Error for trace ${traceId}:`),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('throws error when response is not OK', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(client.fetchTrace(traceId)).rejects.toThrow(`Failed to fetch trace "${traceId}": 404 Not Found`);
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
