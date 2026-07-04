// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

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
import type { IOtelTrace } from '../../types/otel';

function makeTrace(traceID: string): IOtelTrace {
  return { traceID } as IOtelTrace;
}

describe('useNormalizeTraceId', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation = { search: '', state: null };
  });

  it('redirects when backend returns a different canonical ID (uppercase → lowercase)', () => {
    const urlId = 'ABC123DEF456';
    const canonicalId = 'abc123def456';
    const trace = makeTrace(canonicalId);

    renderHook(() => useNormalizeTraceId(urlId, trace));

    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${canonicalId}`, {
      replace: true,
      state: null,
    });
  });

  it('redirects when backend returns a different canonical ID (base64 → hex)', () => {
    const urlId = 's23gbclyqrBxrBGcUEygfA==';
    const canonicalId = 'b36de06c5972ab071ac119c504ca07dc';
    const trace = makeTrace(canonicalId);

    renderHook(() => useNormalizeTraceId(urlId, trace));

    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${canonicalId}`, {
      replace: true,
      state: null,
    });
  });

  it('preserves query parameters during redirect', () => {
    const urlId = 'ABC123DEF456';
    const canonicalId = 'abc123def456';
    const searchParams = '?uiFind=foo&x=1';

    mockLocation = { search: searchParams, state: null };
    const trace = makeTrace(canonicalId);

    renderHook(() => useNormalizeTraceId(urlId, trace));

    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${canonicalId}${searchParams}`, {
      replace: true,
      state: null,
    });
  });

  it('does not redirect when trace ID already matches', () => {
    const id = 'abc123def456';
    const trace = makeTrace(id);

    renderHook(() => useNormalizeTraceId(id, trace));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not redirect when trace is not yet loaded', () => {
    renderHook(() => useNormalizeTraceId('abc123', undefined));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
