// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { JaegerClient } from './client';
import capture from './v3-trace-output.json';

describe('JaegerClient.fetchTrace wire contract', () => {
  let client: JaegerClient;
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    client = new JaegerClient();
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    (global as any).fetch = mockFetch;
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
  });

  it('validates and returns result.resourceSpans on success', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => capture });
    const promise = client.fetchTrace('0123456789abcdef0123456789abcdef');
    const data = await promise;
    expect(data.resourceSpans).toHaveLength(1);
    expect(data.resourceSpans?.[0]?.scopeSpans?.[0]?.spans).toHaveLength(3);
    expect(data.resourceSpans?.[0]?.scopeSpans?.[0]?.spans?.[0]?.traceId).toBe(
      '0123456789abcdef0123456789abcdef'
    );
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v3/traces/0123456789abcdef0123456789abcdef',
      expect.any(Object)
    );
  });

  it('rejects when request traceId is not 32-char hex', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => capture });
    const promise = client.fetchTrace('NOT_HEX' as any);
    await expect(promise).rejects.toThrow('must be 32-char hex string');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects when envelope is missing result', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ resourceSpans: [] }) });
    const promise = client.fetchTrace('0123456789abcdef0123456789abcdef');
    const err = await promise.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(z.ZodError);
    expect((err as z.ZodError).issues[0].path).toContain('result');
  });

  it('rejects when response contains base64 traceId', async () => {
    const bad = JSON.parse(JSON.stringify(capture));
    bad.result.resourceSpans[0].scopeSpans[0].spans[0].traceId = 'AQIDBA==';
    mockFetch.mockResolvedValue({ ok: true, json: async () => bad });
    const promise = client.fetchTrace('0123456789abcdef0123456789abcdef');
    await expect(promise).rejects.toThrow('Invalid trace ID');
  });

  it('rejects when timestamps are numeric instead of quoted strings', async () => {
    const bad = JSON.parse(JSON.stringify(capture));
    bad.result.resourceSpans[0].scopeSpans[0].spans[0].startTimeUnixNano = 1000000;
    mockFetch.mockResolvedValue({ ok: true, json: async () => bad });
    const promise = client.fetchTrace('0123456789abcdef0123456789abcdef');
    await expect(promise).rejects.toThrow('expected string, received number');
  });

  it('throws on non-ok HTTP response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) });
    const promise = client.fetchTrace('0123456789abcdef0123456789abcdef');
    await expect(promise).rejects.toThrow('Failed to fetch trace');
  });
});
