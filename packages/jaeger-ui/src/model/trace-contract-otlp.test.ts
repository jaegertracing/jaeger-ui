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
    { spanID: 'd4dcb46e95b781f5', operationName: 'root' },
    { spanID: 'child', operationName: 'child', parentSpanID: 'd4dcb46e95b781f5' },
  ],
};

describe('OTLP trace contract materializer', () => {
  it('renders valid OTLP with stable hex span IDs', () => {
    const wire = toOtlpTrace(spec);
    expect(refinedTracesData.safeParse(wire).success).toBe(true);

    const spans = wire.resourceSpans![0].scopeSpans[0].spans;
    expect(spans.map(span => span.spanId)).toEqual([spec.spans[0].spanID, spanIDForWire('child')]);
    expect(spans[1].parentSpanId).toBe(spec.spans[0].spanID);
    expect(spanIDForWire('child')).toBe(spanIDForWire('child'));
    expect(spanIDForWire('child')).not.toBe(spanIDForWire('other'));
    expect(spanIDForWire('D4DCB46E95B781F5')).toBe('d4dcb46e95b781f5');
  });

  it('uses default timing and omits explicitly missing or unusable timestamps', () => {
    const wire = toOtlpTrace({
      ...spec,
      spans: [
        { spanID: 'default', operationName: 'default' },
        { spanID: 'missing-start', operationName: 'missing-start', startTime: undefined },
        { spanID: 'nan-start', operationName: 'nan-start', startTime: NaN },
        { spanID: 'missing-end', operationName: 'missing-end', duration: undefined },
      ],
    });
    expect(refinedTracesData.safeParse(wire).success).toBe(true);

    const spans = wire.resourceSpans![0].scopeSpans[0].spans;
    expect(spans[0]).toMatchObject({ startTimeUnixNano: '1000', endTimeUnixNano: '2000' });
    expect(spans[1]).not.toHaveProperty('startTimeUnixNano');
    expect(spans[2]).not.toHaveProperty('startTimeUnixNano');
    expect(spans[3]).not.toHaveProperty('endTimeUnixNano');
  });

  it('encodes OTLP attribute types and reference links', () => {
    const wire = toOtlpTrace({
      ...spec,
      spans: [
        {
          spanID: 'linked',
          operationName: 'linked',
          references: [
            { refType: 'CHILD_OF', spanID: 'child' },
            { refType: 'CHILD_OF', spanID: 'other' },
          ],
          tags: [
            { key: 'string', value: 'value' },
            { key: 'bool', value: false },
            { key: 'int', value: 0 },
            { key: 'double', value: 1.5 },
          ],
        },
        {
          spanID: 'follower',
          operationName: 'follower',
          references: [{ refType: 'FOLLOWS_FROM', spanID: 'other' }],
        },
      ],
    });
    expect(refinedTracesData.safeParse(wire).success).toBe(true);

    const spans = wire.resourceSpans![0].scopeSpans[0].spans;
    expect(spans[0].attributes).toEqual([
      { key: 'string', value: { stringValue: 'value' } },
      { key: 'bool', value: { boolValue: false } },
      { key: 'int', value: { intValue: '0' } },
      { key: 'double', value: { doubleValue: 1.5 } },
    ]);
    expect(spans[0].parentSpanId).toBe(spanIDForWire('child'));
    expect(spans[0].links).toEqual([
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('other'),
        attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'child_of' } }],
      },
    ]);
    expect(spans[1].links).toEqual([
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('other'),
        attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'follows_from' } }],
      },
    ]);
  });

  it.each([
    { timing: { startTime: -1 }, field: 'startTime' },
    { timing: { startTime: 1.5 }, field: 'startTime' },
    { timing: { duration: -1 }, field: 'duration' },
    { timing: { duration: 1.5 }, field: 'duration' },
  ])('rejects an invalid $field', ({ timing, field }) => {
    expect(() => toOtlpTrace({ ...spec, spans: [{ ...spec.spans[0], ...timing }] })).toThrow(
      `Invalid OTLP ${field}`
    );
  });
});
