// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const mockNavigate = jest.fn();
let mockLocation: { search: string; state: unknown } = { search: '', state: null };

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

jest.mock('./url', () => ({
  getUrl: (id: string) => `/trace/${id}`,
}));

import { renderHook } from '@testing-library/react';

import { useNormalizeTraceId } from './useNormalizeTraceId';

describe('useNormalizeTraceId', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation = { search: '', state: null };
  });

  it('normalizes uppercase trace IDs to lowercase in the URL', () => {
    const uppercaseTraceId = 'ABC123DEF456';
    const lowercaseTraceId = uppercaseTraceId.toLowerCase();

    const { result } = renderHook(() => useNormalizeTraceId(uppercaseTraceId));

    expect(result.current).toBe(lowercaseTraceId);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${lowercaseTraceId}`, {
      replace: true,
      state: null,
    });
  });

  it('preserves query parameters during trace ID normalization', () => {
    const uppercaseTraceId = 'ABC123DEF456';
    const lowercaseTraceId = uppercaseTraceId.toLowerCase();
    const searchParams = '?uiFind=foo&x=1';

    mockLocation = { search: searchParams, state: null };

    const { result } = renderHook(() => useNormalizeTraceId(uppercaseTraceId));

    expect(result.current).toBe(lowercaseTraceId);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${lowercaseTraceId}${searchParams}`, {
      replace: true,
      state: null,
    });
  });

  it('does not redirect when trace ID is already lowercase', () => {
    const lowercaseTraceId = 'abc123def456';

    const { result } = renderHook(() => useNormalizeTraceId(lowercaseTraceId));

    expect(result.current).toBe(lowercaseTraceId);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
