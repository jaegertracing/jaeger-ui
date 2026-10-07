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
  it('preserves span order when instrumentation scopes alternate', () => {
    const spans = [
      { spanID: 'a', operationName: 'a', scope: { name: 'first' } },
      { spanID: 'b', operationName: 'b', scope: { name: 'second' } },
      { spanID: 'c', operationName: 'c', scope: { name: 'first' } },
    ];
    const wire = toOtlpTrace({ ...spec, spans });
    expect(wire.resourceSpans![0].scopeSpans.flatMap(group => group.spans.map(span => span.spanId))).toEqual(
      spans.map(span => spanIDForWire(span.spanID))
    );
  });

  it('renders kinds, per-span scopes, and events without inventing missing names', () => {
    const wire = toOtlpTrace({
      ...spec,
      spans: [
        { spanID: 'missing', operationName: 'missing', events: [{ timestamp: 2 }] },
        { spanID: 'empty-scope', operationName: 'empty-scope', scope: {} },
        {
          spanID: 'named',
          operationName: 'named',
          kind: 2,
          scope: { name: 'library', version: '1' },
          events: [{ name: 'event', timestamp: 3, attributes: [{ key: 'value', value: false }] }],
        },
      ],
    });
    expect(refinedTracesData.safeParse(wire).success).toBe(true);
    const groups = wire.resourceSpans![0].scopeSpans;
    expect(groups).toHaveLength(3);
    expect(groups[0]).not.toHaveProperty('scope');
    expect(groups[0].spans[0]).not.toHaveProperty('kind');
    expect(groups[0].spans[0].events![0]).not.toHaveProperty('name');
    expect(groups[0].spans[0].events![0].timeUnixNano).toBe('2000');
    expect(groups[1].scope).toEqual({});
    expect(groups[2].scope).toEqual({ name: 'library', version: '1' });
    expect(groups[2].spans[0]).toMatchObject({
      kind: 2,
      events: [
        { name: 'event', timeUnixNano: '3000', attributes: [{ key: 'value', value: { boolValue: false } }] },
      ],
    });
  });

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
    expect(spans[0]).not.toHaveProperty('parentSpanId');
    expect(spans[0].links).toEqual([
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('child'),
        attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'child_of' } }],
      },
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('other'),
        attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'child_of' } }],
      },
    ]);
    expect(spans[1]).not.toHaveProperty('parentSpanId');
    expect(spans[1].links).toEqual([
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('other'),
        attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'follows_from' } }],
      },
    ]);
  });

  it.each([undefined, 'explicit-parent'])('uses only parentSpanID=%s for parentage', parentSpanID => {
    const wire = toOtlpTrace({
      ...spec,
      spans: [
        {
          spanID: 'linked',
          operationName: 'linked',
          parentSpanID,
          references: [
            { refType: 'FOLLOWS_FROM', spanID: 'follower-target' },
            { refType: 'CHILD_OF', spanID: 'parent-target' },
            { refType: 'CHILD_OF', spanID: 'other-target' },
          ],
        },
      ],
    });

    const span = wire.resourceSpans![0].scopeSpans[0].spans[0];
    if (parentSpanID === undefined) {
      expect(span).not.toHaveProperty('parentSpanId');
    } else {
      expect(span.parentSpanId).toBe(spanIDForWire(parentSpanID));
    }
    expect(span.links).toEqual([
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('follower-target'),
        attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'follows_from' } }],
      },
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('parent-target'),
        attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'child_of' } }],
      },
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('other-target'),
        attributes: [{ key: 'opentracing.ref_type', value: { stringValue: 'child_of' } }],
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
