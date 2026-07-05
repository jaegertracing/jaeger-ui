// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook } from '@testing-library/react';

import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import { useSpanPills } from './useSpanPills';

const mockBuildSpanPills = vi.hoisted(() =>
  vi.fn(() => new Map([['span-1', [{ label: 'http.status_code', value: '200' }]]]))
);

vi.mock('./spanPills', () => ({
  buildSpanPills: mockBuildSpanPills,
}));

const mockUseConfig = vi.hoisted(() => vi.fn(() => ({ traceTimeline: { spanPillsEnabled: true } })));

vi.mock('../../../hooks/useConfig', () => ({
  useConfig: mockUseConfig,
}));

describe('useSpanPills', () => {
  const trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 3 }))!.asOtelTrace();

  beforeEach(() => {
    mockBuildSpanPills.mockClear();
    mockUseConfig.mockReturnValue({ traceTimeline: { spanPillsEnabled: true } });
  });

  it('returns buildSpanPills result when spanPillsEnabled is true', () => {
    const { result } = renderHook(() => useSpanPills(trace));
    expect(mockBuildSpanPills).toHaveBeenCalledWith(trace);
    expect(result.current.get('span-1')).toEqual([{ label: 'http.status_code', value: '200' }]);
  });

  it('returns an empty map when spanPillsEnabled is false', () => {
    mockUseConfig.mockReturnValue({ traceTimeline: { spanPillsEnabled: false } });
    const { result } = renderHook(() => useSpanPills(trace));
    expect(mockBuildSpanPills).not.toHaveBeenCalled();
    expect(result.current.size).toBe(0);
  });
});
