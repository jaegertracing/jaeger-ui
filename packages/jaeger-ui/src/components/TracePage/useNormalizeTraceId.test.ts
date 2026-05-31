// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Simplified mock sufficient for testing normalization logic;
// URL prefix handling is tested separately in url/index.test.js
vi.mock('./url', async () => ({
  getUrl: (id: string) => `/trace/${id}`,
}));

const mockNavigate = vi.fn();
let mockLocation: { search: string; state: unknown } = { search: '', state: null };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

import { renderHook } from '@testing-library/react';

import { useNormalizeTraceId } from './useNormalizeTraceId';

describe('useNormalizeTraceId', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation = { search: '', state: null };
  });

  it('does not redirect when trace ID is already the canonical 32-char lowercase form', () => {
    const fullId = 'f77950feed55c1ce91dd8e87896623a6';

    const { result } = renderHook(() => useNormalizeTraceId(fullId));

    expect(result.current).toBe(fullId);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('lowercases an uppercase 32-char trace ID in the URL', () => {
    const upperId = 'F77950FEED55C1CE91DD8E87896623A6';
    const lowerId = upperId.toLowerCase();

    const { result } = renderHook(() => useNormalizeTraceId(upperId));

    expect(result.current).toBe(lowerId);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${lowerId}`, {
      replace: true,
      state: null,
    });
  });

  it('pads a short lowercase trace ID with leading zeros to 32 chars', () => {
    const shortId = 'abc123def456';
    const paddedId = shortId.padStart(32, '0');

    const { result } = renderHook(() => useNormalizeTraceId(shortId));

    expect(result.current).toBe(paddedId);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${paddedId}`, {
      replace: true,
      state: null,
    });
  });

  it('pads a short ID that already has some leading zeros', () => {
    const shortId = '000abc123def456';
    const paddedId = shortId.padStart(32, '0');

    const { result } = renderHook(() => useNormalizeTraceId(shortId));

    expect(result.current).toBe(paddedId);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${paddedId}`, {
      replace: true,
      state: null,
    });
  });

  it('lowercases and pads in a single redirect', () => {
    const shortUpperId = '000ABC123';
    const paddedId = shortUpperId.toLowerCase().padStart(32, '0');

    const { result } = renderHook(() => useNormalizeTraceId(shortUpperId));

    expect(result.current).toBe(paddedId);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${paddedId}`, {
      replace: true,
      state: null,
    });
  });

  it('preserves query parameters during normalization', () => {
    const shortUpperId = 'ABC123DEF456';
    const paddedId = shortUpperId.toLowerCase().padStart(32, '0');
    const searchParams = '?uiFind=foo&x=1';

    mockLocation = { search: searchParams, state: null };

    const { result } = renderHook(() => useNormalizeTraceId(shortUpperId));

    expect(result.current).toBe(paddedId);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${paddedId}${searchParams}`, {
      replace: true,
      state: null,
    });
  });
});
