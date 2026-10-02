// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { refinedTracesData } from '../api/v3/schemas';
import type { ITraceSpec } from './trace-contract-spec';
import { spanIDForWire, toOtlpTrace } from './trace-contract-otlp';

const spec: ITraceSpec = {
  traceID: 'f77950feed55c1ce91dd8e87896623a6',
  serviceName: 'serviceName',
  spans: [
    { spanID: 'd4dcb46e95b781f5', operationName: 'root', startTime: 1000, duration: 20 },
    { spanID: 'child', operationName: 'child', parentSpanID: 'd4dcb46e95b781f5', duration: 10 },
    {
      spanID: 'linked',
      operationName: 'linked',
      references: [
        { refType: 'CHILD_OF', spanID: 'child' },
        { refType: 'CHILD_OF', spanID: 'missing' },
      ],
      startTime: 0,
      duration: 5,
    },
  ],
};

describe('OTLP trace contract materializer', () => {
  it('renders span specs with valid IDs, microsecond timing and reference links', () => {
    const wire = toOtlpTrace(spec);
    expect(refinedTracesData.safeParse(wire).success).toBe(true);
    const spans = wire.resourceSpans![0].scopeSpans[0].spans;
    expect(spans).toHaveLength(spec.spans.length);
    expect(spans[0]).toMatchObject({
      spanId: spec.spans[0].spanID,
      startTimeUnixNano: '1000000',
      endTimeUnixNano: '1020000',
    });
    expect(spans[1]).toMatchObject({
      spanId: spanIDForWire('child'),
      parentSpanId: spec.spans[0].spanID,
      endTimeUnixNano: '10000',
    });
    expect(spans[1]).not.toHaveProperty('startTimeUnixNano');
    expect(spans[2]).toMatchObject({
      parentSpanId: spanIDForWire('child'),
      links: [
        {
          traceId: spec.traceID,
          spanId: spanIDForWire('missing'),
          attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'child_of' } }],
        },
      ],
    });
    expect(spans[2]).not.toHaveProperty('startTimeUnixNano');
  });

  it('preserves a primary FOLLOWS_FROM link', () => {
    const wire = toOtlpTrace({
      ...spec,
      spans: [
        {
          spanID: 'follower',
          operationName: 'follower',
          references: [{ refType: 'FOLLOWS_FROM', spanID: 'missing' }],
          startTime: 0,
          duration: 10,
        },
      ],
    });
    expect(refinedTracesData.safeParse(wire).success).toBe(true);
    const span = wire.resourceSpans![0].scopeSpans[0].spans[0];
    expect(span.parentSpanId).toBe(spanIDForWire('missing'));
    expect(span.links).toEqual([
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('missing'),
        attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'follows_from' } }],
      },
    ]);
    expect(span).not.toHaveProperty('startTimeUnixNano');
  });

  it('rejects NaN instead of silently changing a legacy-only input', () => {
    expect(() => toOtlpTrace({ ...spec, spans: [{ ...spec.spans[0], startTime: NaN }] })).toThrow(
      'Invalid OTLP startTime'
    );
  });

  it('maps labels deterministically and returns fresh wire objects', () => {
    expect(spanIDForWire('child')).toBe(spanIDForWire('child'));
    expect(spanIDForWire('child')).not.toBe(spanIDForWire('linked'));
    expect(spanIDForWire('D4DCB46E95B781F5')).toBe('d4dcb46e95b781f5');
    const first = toOtlpTrace(spec);
    const second = toOtlpTrace(spec);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.resourceSpans![0].scopeSpans[0].spans[0]).not.toBe(
      second.resourceSpans![0].scopeSpans[0].spans[0]
    );
  });
});
