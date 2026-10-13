// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getJSON, getMessageFromError } from './http';

describe('getMessageFromError()', () => {
  describe('{ code, msg } error data', () => {
    const data = { code: 1, msg: 'some-message' };

    it('ignores code if it is the same as `status` arg', () => {
      expect(getMessageFromError(data, 1)).toBe(data.msg);
    });

    it('returns`$code - $msg` when code is novel', () => {
      const rv = getMessageFromError(data, -1);
      expect(rv).toBe(`${data.code} - ${data.msg}`);
    });
  });
  describe('other data formats', () => {
    it('stringifies the value, when possible', () => {
      const data = ['abc'];
      expect(getMessageFromError(data, 0)).toBe(JSON.stringify(data));
    });

    it('returns the string, otherwise', () => {
      const data: Record<string, unknown> = {};
      data.data = data;
      expect(getMessageFromError(data, 0)).toBe(String(data));
    });
  });
});

describe('getJSON', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves query encoding, response envelopes, and same-origin credentials', async () => {
    const response = { data: [{ service: 'service/name' }] };
    mockFetch.mockResolvedValue({ status: 200, json: async () => response });

    await expect(getJSON('/custom-api/dependencies', { query: { service: 'service/name' } })).resolves.toBe(
      response
    );
    expect(mockFetch).toHaveBeenCalledWith('/custom-api/dependencies?service=service%2Fname', {
      credentials: 'same-origin',
    });
  });

  it('preserves structured backend errors and HTTP details', async () => {
    const body = {
      errors: [
        { code: 403, msg: 'Archive disabled' },
        { code: 7, msg: 'Permission denied' },
      ],
    };
    mockFetch.mockResolvedValue({
      status: 403,
      statusText: 'Forbidden',
      text: async () => JSON.stringify(body),
    });

    await expect(getJSON('/api/archive/trace-id')).rejects.toMatchObject({
      message: 'HTTP Error: Archive disabled; 7 - Permission denied',
      httpStatus: 403,
      httpStatusText: 'Forbidden',
      httpBody: JSON.stringify(body, null, 2),
      httpUrl: '/api/archive/trace-id',
      httpQuery: '',
    });
  });

  it.each([
    ['plain-text backend error', '  Backend unavailable  ', 'HTTP Error: Backend unavailable'],
    ['empty backend error', '', 'HTTP Error: 503 - Service Unavailable'],
  ])('preserves %s', async (_label, body, message) => {
    mockFetch.mockResolvedValue({
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => body,
    });

    await expect(getJSON('https://decorations.example/details?service=frontend')).rejects.toMatchObject({
      message,
      httpBody: body,
      httpUrl: 'https://decorations.example/details?service=frontend',
    });
  });

  it('preserves network failures', async () => {
    const failure = new TypeError('Failed to fetch');
    mockFetch.mockRejectedValue(failure);

    await expect(getJSON('/api/archive/trace-id', { method: 'POST' })).rejects.toBe(failure);
  });
});
