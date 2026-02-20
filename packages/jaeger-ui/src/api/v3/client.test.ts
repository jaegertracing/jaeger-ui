// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { JaegerClient, jaegerClient } from './client';

describe('JaegerClient', () => {
  let client: JaegerClient;
  let mockFetch: jest.Mock;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    client = new JaegerClient();
    originalFetch = globalThis.fetch;
    mockFetch = jest.fn();
    (global as any).fetch = mockFetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.useRealTimers();
  });

  describe('fetchServices', () => {
    it('successfully fetches and returns service list', async () => {
      const mockServices = ['service-a', 'service-b', 'service-c'];
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ services: mockServices }),
      });

      const promise = client.fetchServices();
      jest.runAllTimers();
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
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('throws validation error when API returns no services field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const promise = client.fetchServices();
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(); // ZodError
    });

    it('throws error when response is not OK', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      const promise = client.fetchServices();
      jest.runAllTimers();

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
      jest.runAllTimers();

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
      jest.runAllTimers();
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
      jest.runAllTimers();
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
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('throws validation error when API returns no operations field', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const promise = client.fetchSpanNames('test-service');
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(); // ZodError
    });

    it('throws error when response is not OK with service name in message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      });

      const promise = client.fetchSpanNames('my-service');
      jest.runAllTimers();

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
      jest.runAllTimers();
      const result = await promise;

      expect(result).toEqual([]);
    });

    it('throws validation error when API returns invalid structure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ services: 'not-an-array' }),
      });

      const promise = client.fetchServices();
      jest.runAllTimers();

      await expect(promise).rejects.toThrow(); // ZodError
    });

    it('aborts and throws timeout error after default timeout (10s)', async () => {
      let abortController: AbortController | null = null;
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
      jest.advanceTimersByTime(10000);

      await expect(promise).rejects.toThrow('Request timeout after 10000ms');
    });

    it('clears timeout after successful request', async () => {
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ services: [] }),
      });

      const promise = client.fetchServices();
      jest.runAllTimers();
      await promise;

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('handles network errors that are not timeout-related', async () => {
      const networkError = new Error('Network connection failed');
      mockFetch.mockRejectedValue(networkError);

      const promise = client.fetchServices();
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('Network connection failed');
    });

    it('clears timeout even when request fails', async () => {
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const promise = client.fetchServices();
      jest.runAllTimers();

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
    });
  });
});

describe('JaegerClient with non-default base path', () => {
  let mockFetch: jest.Mock;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = jest.fn();
    (global as any).fetch = mockFetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.useRealTimers();
  });

  it('calls services endpoint with non-default prefix in the URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ services: ['svc-a'] }),
    });

    let Client: any;
    jest.isolateModules(() => {
      jest.mock('../../utils/prefix-url', () => (path: string) => `/jaeger${path}`);

      Client = require('./client').JaegerClient;
    });

    const clientWithPrefix = new Client();
    const promise = clientWithPrefix.fetchServices();
    jest.runAllTimers();
    await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      '/jaeger/api/v3/services',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('calls operations endpoint with non-default prefix in the URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ operations: [] }),
    });

    let Client: any;
    jest.isolateModules(() => {
      jest.mock('../../utils/prefix-url', () => (path: string) => `/jaeger${path}`);

      Client = require('./client').JaegerClient;
    });

    const clientWithPrefix = new Client();
    const promise = clientWithPrefix.fetchSpanNames('my-service');
    jest.runAllTimers();
    await promise;

    expect(mockFetch).toHaveBeenCalledWith(
      '/jaeger/api/v3/operations?service=my-service',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });
});
