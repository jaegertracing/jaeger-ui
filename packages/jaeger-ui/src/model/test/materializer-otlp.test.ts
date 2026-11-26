// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { validateTracesData } from '../../api/v3/schemas';
import type { ITraceSpec } from './trace-contract-spec';
import { spanIDForWire, toOtlpTrace } from './materializer-otlp';

const spec: ITraceSpec = {
  traceID: 'f77950feed55c1ce91dd8e87896623a6',
  serviceName: 'serviceName',
  spans: [
    { spanID: 'd4dcb46e95b781f5', name: 'root' },
    { spanID: 'child', name: 'child', parentSpanID: 'd4dcb46e95b781f5' },
  ],
};

describe('OTLP trace contract materializer', () => {
  it('renders kinds, scopes, and events, omitting what the spec omits', () => {
    const wire = toOtlpTrace({
      ...spec,
      spans: [
        { spanID: 'missing', name: 'missing', events: [{ timestamp: 2 }] },
        { spanID: 'empty-scope', name: 'empty-scope', scope: {} },
        {
          spanID: 'named',
          name: 'named',
          kind: 'server',
          scope: { name: 'library', version: '1' },
          events: [{ name: 'event', timestamp: 3, attributes: [{ key: 'value', value: false }] }],
        },
      ],
    });
    expect(() => validateTracesData(wire)).not.toThrow();
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
    expect(() => validateTracesData(wire)).not.toThrow();

    const spans = wire.resourceSpans![0].scopeSpans.flatMap(group => group.spans);
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
        { spanID: 'default', name: 'default' },
        { spanID: 'missing-start', name: 'missing-start', startTime: undefined },
        { spanID: 'nan-start', name: 'nan-start', startTime: NaN },
        { spanID: 'missing-end', name: 'missing-end', duration: undefined },
      ],
    });
    expect(() => validateTracesData(wire)).not.toThrow();

    const spans = wire.resourceSpans![0].scopeSpans.flatMap(group => group.spans);
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
          name: 'linked',
          links: [
            { spanID: 'child' },
            {
              spanID: 'other',
              traceID: '0123456789abcdef0123456789abcdef',
              attributes: [{ key: 'link.attr', value: 'value' }],
            },
          ],
          attributes: [
            { key: 'string', value: 'value' },
            { key: 'bool', value: false },
            { key: 'int', value: 0 },
            { key: 'double', value: 1.5 },
          ],
        },
        {
          spanID: 'follower',
          name: 'follower',
          links: [{ spanID: 'other' }],
        },
      ],
    });
    expect(() => validateTracesData(wire)).not.toThrow();

    const spans = wire.resourceSpans![0].scopeSpans.flatMap(group => group.spans);
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
        attributes: [],
      },
      {
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: spanIDForWire('other'),
        attributes: [{ key: 'link.attr', value: { stringValue: 'value' } }],
      },
    ]);
    expect(spans[1]).not.toHaveProperty('parentSpanId');
    expect(spans[1].links).toEqual([
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('other'),
        attributes: [],
      },
    ]);
  });

  it.each([undefined, 'explicit-parent'])('uses only parentSpanID=%s for parentage', parentSpanID => {
    const wire = toOtlpTrace({
      ...spec,
      spans: [
        {
          spanID: 'linked',
          name: 'linked',
          parentSpanID,
          links: [{ spanID: 'follower-target' }, { spanID: 'parent-target' }, { spanID: 'other-target' }],
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
        attributes: [],
      },
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('parent-target'),
        attributes: [],
      },
      {
        traceId: spec.traceID,
        spanId: spanIDForWire('other-target'),
        attributes: [],
      },
    ]);
  });

  it('renders status codes and an empty status when none is set', () => {
    const wire = toOtlpTrace({
      ...spec,
      spans: [
        { spanID: 'unset', name: 'unset', status: { code: 'unset' } },
        { spanID: 'ok', name: 'ok', status: { code: 'ok' } },
        { spanID: 'error', name: 'error', status: { code: 'error', message: 'boom' } },
        { spanID: 'none', name: 'none' },
      ],
    });
    expect(() => validateTracesData(wire)).not.toThrow();

    const spans = wire.resourceSpans![0].scopeSpans.flatMap(group => group.spans);
    expect(spans[0].status).toEqual({ code: 0 });
    expect(spans[1].status).toEqual({ code: 1 });
    expect(spans[2].status).toEqual({ code: 2, message: 'boom' });
    expect(spans[3].status).toEqual({});
  });

  it('groups spans into one resource per service and appends trace resource attributes', () => {
    const wire = toOtlpTrace({
      ...spec,
      resourceAttributes: [{ key: 'deployment.environment', value: 'test' }],
      spans: [
        { spanID: 'a', name: 'a' },
        { spanID: 'b', name: 'b', serviceName: 'other' },
        { spanID: 'c', name: 'c' },
      ],
    });
    expect(() => validateTracesData(wire)).not.toThrow();

    const resources = wire.resourceSpans!;
    expect(resources.map(group => group.resource!.attributes)).toEqual([
      [
        { key: 'service.name', value: { stringValue: 'serviceName' } },
        { key: 'deployment.environment', value: { stringValue: 'test' } },
      ],
      [
        { key: 'service.name', value: { stringValue: 'other' } },
        { key: 'deployment.environment', value: { stringValue: 'test' } },
      ],
    ]);
    expect(
      resources.map(group => group.scopeSpans.flatMap(scopes => scopes.spans.map(span => span.spanId)))
    ).toEqual([[spanIDForWire('a'), spanIDForWire('c')], [spanIDForWire('b')]]);
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
