// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook } from '@testing-library/react';

import transformTraceData from '../../../model/transform-trace-data';
import { IOtelSpan } from '../../../types/otel';
import { getSpanPillsForSpan, useSpanPillsEnabled } from './spanPills';

const mockUseConfig = vi.hoisted(() => vi.fn(() => ({ traceTimeline: {} })));

vi.mock('../../../hooks/useConfig', () => ({
  useConfig: mockUseConfig,
}));

function makeSpan(attributes: { key: string; value: string }[]): IOtelSpan {
  return {
    spanID: 's1',
    attributes,
    resource: { serviceName: 'svc', attributes: [] },
    name: 'op',
    startTime: 0,
    endTime: 1,
    duration: 1,
    childSpans: [],
    links: [],
    inboundLinks: [],
    events: [],
    status: { code: 0 },
    kind: 0,
  } as unknown as IOtelSpan;
}

const httpStatusTrace = transformTraceData({
  traceID: 'http-status-trace',
  processes: { p1: { serviceName: 'svc', tags: [] } },
  spans: [
    {
      spanID: 's1',
      traceID: 'http-status-trace',
      operationName: 'ok',
      duration: 1,
      startTime: 1,
      processID: 'p1',
      references: [],
      tags: [{ key: 'http.status_code', value: '200' }],
    },
    {
      spanID: 's2',
      traceID: 'http-status-trace',
      operationName: 'err',
      duration: 1,
      startTime: 2,
      processID: 'p1',
      references: [],
      tags: [{ key: 'http.response.status_code', value: '503' }],
    },
    {
      spanID: 's3',
      traceID: 'http-status-trace',
      operationName: 'none',
      duration: 1,
      startTime: 3,
      processID: 'p1',
      references: [],
      tags: [{ key: 'region', value: 'us-east-1' }],
    },
  ],
})!.asOtelTrace();

describe('spanPills', () => {
  describe('getSpanPillsForSpan', () => {
    it('maps http.status_code and http.response.status_code to pills', () => {
      const [s1, s2, s3] = httpStatusTrace.spans;
      expect(getSpanPillsForSpan(s1)).toEqual([{ label: 'http.status_code', value: '200' }]);
      expect(getSpanPillsForSpan(s2)).toEqual([{ label: 'http.status_code', value: '503', isError: true }]);
      expect(getSpanPillsForSpan(s3)).toEqual([]);
    });

    it('prefers http.status_code when both status attributes are present', () => {
      const span = makeSpan([
        { key: 'http.status_code', value: '200' },
        { key: 'http.response.status_code', value: '500' },
      ]);
      expect(getSpanPillsForSpan(span)).toEqual([{ label: 'http.status_code', value: '200' }]);
    });

    it('falls back to http.response.status_code when http.status_code is empty', () => {
      const span = makeSpan([
        { key: 'http.status_code', value: '' },
        { key: 'http.response.status_code', value: '503' },
      ]);
      expect(getSpanPillsForSpan(span)).toEqual([{ label: 'http.status_code', value: '503', isError: true }]);
    });

    it('sets isError for 5xx status codes only', () => {
      expect(getSpanPillsForSpan(makeSpan([{ key: 'http.status_code', value: '500' }]))).toEqual([
        { label: 'http.status_code', value: '500', isError: true },
      ]);
      expect(getSpanPillsForSpan(makeSpan([{ key: 'http.status_code', value: '404' }]))).toEqual([
        { label: 'http.status_code', value: '404' },
      ]);
      expect(getSpanPillsForSpan(makeSpan([{ key: 'http.status_code', value: 'not-a-number' }]))).toEqual([
        { label: 'http.status_code', value: 'not-a-number' },
      ]);
    });
  });

  describe('useSpanPillsEnabled', () => {
    beforeEach(() => {
      mockUseConfig.mockReturnValue({ traceTimeline: {} });
    });

    it('defaults to enabled when config omits the flag', () => {
      const { result } = renderHook(() => useSpanPillsEnabled());
      expect(result.current).toBe(true);
    });

    it('returns true when spanPillsEnabled is true', () => {
      mockUseConfig.mockReturnValue({ traceTimeline: { spanPillsEnabled: true } });
      const { result } = renderHook(() => useSpanPillsEnabled());
      expect(result.current).toBe(true);
    });

    it('returns false when spanPillsEnabled is false', () => {
      mockUseConfig.mockReturnValue({ traceTimeline: { spanPillsEnabled: false } });
      const { result } = renderHook(() => useSpanPillsEnabled());
      expect(result.current).toBe(false);
    });
  });
});
