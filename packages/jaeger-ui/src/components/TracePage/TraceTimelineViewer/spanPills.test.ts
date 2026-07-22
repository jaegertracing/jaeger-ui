// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook } from '@testing-library/react';

import { GEN_AI_REQUEST_MODEL_KEY } from '../../../constants/span-attributes';
import transformTraceData from '../../../model/transform-trace-data';
import { AttributeValue, IOtelSpan } from '../../../types/otel';
import { getSpanPillsForSpan, useSpanPillsEnabled } from './spanPills';
import { makeAttributes } from '../../../model/attributes';

const mockUseConfig = vi.hoisted(() => vi.fn(() => ({ traceTimeline: {} })));

vi.mock('../../../hooks/useConfig', () => ({
  useConfig: mockUseConfig,
}));

function makeSpan(attributes: ReadonlyArray<{ key: string; value: AttributeValue }>): IOtelSpan {
  return {
    spanID: 's1',
    attributes: makeAttributes(attributes),
    resource: { serviceName: 'svc', attributes: makeAttributes() },
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

    it('maps gen_ai.request.model to a pill', () => {
      const span = makeSpan([{ key: GEN_AI_REQUEST_MODEL_KEY, value: 'gpt-4o' }]);
      expect(getSpanPillsForSpan(span)).toEqual([{ label: 'gen_ai.request.model', value: 'gpt-4o' }]);
    });

    it('returns no pill when gen_ai.request.model is absent', () => {
      const span = makeSpan([{ key: 'region', value: 'us-east-1' }]);
      expect(getSpanPillsForSpan(span)).toEqual([]);
    });

    it('returns both pills when http status and gen_ai.request.model are both present', () => {
      const span = makeSpan([
        { key: 'http.status_code', value: '500' },
        { key: GEN_AI_REQUEST_MODEL_KEY, value: 'claude-3-haiku' },
      ]);
      expect(getSpanPillsForSpan(span)).toEqual([
        { label: 'http.status_code', value: '500', isError: true },
        { label: 'gen_ai.request.model', value: 'claude-3-haiku' },
      ]);
    });

    it('returns multiple default pills in source order', () => {
      const span = makeSpan([
        { key: 'http.method', value: 'GET' },
        { key: 'http.status_code', value: '200' },
        { key: 'db.system', value: 'mysql' },
      ]);
      expect(getSpanPillsForSpan(span)).toEqual([
        { label: 'http.status_code', value: '200' },
        { label: 'http.method', value: 'GET' },
        { label: 'db.system', value: 'mysql' },
      ]);
    });

    it('maps http.method and falls back to http.request.method', () => {
      expect(getSpanPillsForSpan(makeSpan([{ key: 'http.method', value: 'POST' }]))).toEqual([
        { label: 'http.method', value: 'POST' },
      ]);
      expect(getSpanPillsForSpan(makeSpan([{ key: 'http.request.method', value: 'PUT' }]))).toEqual([
        { label: 'http.method', value: 'PUT' },
      ]);
      expect(
        getSpanPillsForSpan(
          makeSpan([
            { key: 'http.method', value: 'GET' },
            { key: 'http.request.method', value: 'PUT' },
          ])
        )
      ).toEqual([{ label: 'http.method', value: 'GET' }]);
    });

    it('maps db.system and rpc.system pills', () => {
      expect(getSpanPillsForSpan(makeSpan([{ key: 'db.system', value: 'redis' }]))).toEqual([
        { label: 'db.system', value: 'redis' },
      ]);
      expect(getSpanPillsForSpan(makeSpan([{ key: 'rpc.system', value: 'grpc' }]))).toEqual([
        { label: 'rpc.system', value: 'grpc' },
      ]);
    });

    it('formats non-string attribute values', () => {
      expect(getSpanPillsForSpan(makeSpan([{ key: 'http.status_code', value: 404 }]))).toEqual([
        { label: 'http.status_code', value: '404' },
      ]);
      expect(getSpanPillsForSpan(makeSpan([{ key: 'http.status_code', value: 503 }]))).toEqual([
        { label: 'http.status_code', value: '503', isError: true },
      ]);
      expect(getSpanPillsForSpan(makeSpan([{ key: 'db.system', value: ['mysql', 'postgres'] }]))).toEqual([
        { label: 'db.system', value: '["mysql","postgres"]' },
      ]);
      expect(getSpanPillsForSpan(makeSpan([{ key: 'rpc.system', value: { name: 'grpc' } }]))).toEqual([
        { label: 'rpc.system', value: '{"name":"grpc"}' },
      ]);
      expect(getSpanPillsForSpan(makeSpan([{ key: 'db.system', value: new Uint8Array([1, 2, 3]) }]))).toEqual(
        [{ label: 'db.system', value: '[1,2,3]' }]
      );
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
