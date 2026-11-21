// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  DEFAULT_SERVICE,
  DEFAULT_TRACE_ID,
  makeOtlpSpan,
  makeOtlpTrace,
  makeTrace,
} from './otel-trace-generators';
import { refinedSpan, refinedTracesData } from '../api/v3/schemas';
import { spanIDForWire } from '../model/test/materializer-otlp';
import { SpanKind, StatusCode } from '../types/otel';

describe('makeOtlpSpan', () => {
  it('expands a span id into a valid span with fixed defaults', () => {
    const span = makeOtlpSpan({ id: 'root' });

    expect(refinedSpan.safeParse(span).success).toBe(true);
    expect(span).toEqual({
      traceId: DEFAULT_TRACE_ID,
      spanId: spanIDForWire('root'),
      name: 'operation',
      startTimeUnixNano: '1000000',
      endTimeUnixNano: '2000000',
      attributes: [],
      events: [],
      links: [],
      status: {},
    });
  });

  it('returns the same span regardless of the clock or previous calls', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);

    try {
      const first = makeOtlpSpan({ id: 'root' });
      makeOtlpSpan({ id: 'other', name: 'another operation' });
      now.mockReturnValue(1700000000000);

      expect(makeOtlpSpan({ id: 'root' })).toEqual(first);
    } finally {
      now.mockRestore();
    }
  });

  it('converts brief fields to wire encoding', () => {
    const span = makeOtlpSpan(
      {
        id: 'child',
        parent: 'root',
        name: 'GET /cart',
        kind: SpanKind.SERVER,
        start: 0,
        duration: 250,
        attributes: { 'http.method': 'GET', 'http.status_code': 200, ratio: 0.5, cached: false, empty: '' },
        events: [{ name: 'retry', time: 100, attributes: { attempt: 2 } }, { time: 0 }],
        links: [{ id: 'other', traceId: '0123456789abcdef0123456789abcdef', attributes: { kind: 'batch' } }],
        status: { code: StatusCode.ERROR, message: 'timeout' },
      },
      '0123456789abcdef0123456789abcdef'
    );

    expect(refinedSpan.safeParse(span).success).toBe(true);
    expect(span).toEqual({
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: spanIDForWire('child'),
      parentSpanId: spanIDForWire('root'),
      name: 'GET /cart',
      kind: 2,
      startTimeUnixNano: '0',
      endTimeUnixNano: '250000',
      attributes: [
        { key: 'http.method', value: { stringValue: 'GET' } },
        { key: 'http.status_code', value: { intValue: '200' } },
        { key: 'ratio', value: { doubleValue: 0.5 } },
        { key: 'cached', value: { boolValue: false } },
        { key: 'empty', value: { stringValue: '' } },
      ],
      events: [
        { name: 'retry', timeUnixNano: '100000', attributes: [{ key: 'attempt', value: { intValue: '2' } }] },
        { timeUnixNano: '0', attributes: [] },
      ],
      links: [
        {
          traceId: '0123456789abcdef0123456789abcdef',
          spanId: spanIDForWire('other'),
          attributes: [{ key: 'kind', value: { stringValue: 'batch' } }],
        },
      ],
      status: { code: 2, message: 'timeout' },
    });
  });

  it('keeps valid hex span ids and links to the span trace by default', () => {
    const span = makeOtlpSpan({ id: 'ABCDEF0123456789', links: [{ id: 'root' }] });

    expect(span.spanId).toBe('abcdef0123456789');
    expect(span.links).toEqual([
      { traceId: DEFAULT_TRACE_ID, spanId: spanIDForWire('root'), attributes: [] },
    ]);
  });

  it.each([
    ['start', { start: -1 }],
    ['duration', { duration: 1.5 }],
    ['event time', { events: [{ time: Number.MAX_SAFE_INTEGER + 1 }] }],
  ])('rejects an invalid %s', (field, spec) => {
    expect(() => makeOtlpSpan({ id: 'bad', ...spec })).toThrow(`Invalid ${field} for span bad`);
  });
});

describe('makeOtlpTrace', () => {
  it('groups spans into one resource per service in first-appearance order', () => {
    const scope = { name: 'fixture-library', version: '1.0' };
    const wire = makeOtlpTrace(
      [
        { id: 'root', service: 'frontend' },
        { id: 'db', parent: 'root', service: 'mysql' },
        { id: 'render', parent: 'root', service: 'frontend' },
        { id: 'default' },
      ],
      { scope }
    );

    expect(refinedTracesData.safeParse(wire).success).toBe(true);
    expect(
      wire.resourceSpans!.map(group => ({
        service: group.resource!.attributes![0].value.stringValue,
        scope: group.scopeSpans[0].scope,
        spans: group.scopeSpans[0].spans.map(span => span.spanId),
      }))
    ).toEqual([
      { service: 'frontend', scope, spans: [spanIDForWire('root'), spanIDForWire('render')] },
      { service: 'mysql', scope, spans: [spanIDForWire('db')] },
      { service: DEFAULT_SERVICE, scope, spans: [spanIDForWire('default')] },
    ]);
  });

  it('applies the trace id to every span', () => {
    const traceId = '0123456789abcdef0123456789abcdef';
    const wire = makeOtlpTrace([{ id: 'root' }, { id: 'child', parent: 'root' }], { traceId });

    expect(wire.resourceSpans![0].scopeSpans[0].spans.map(span => span.traceId)).toEqual([traceId, traceId]);
  });

  it('rejects duplicate span ids', () => {
    expect(() => makeOtlpTrace([{ id: 'root' }, { id: 'root', name: 'again' }])).toThrow(
      'Duplicate span id in trace fixture: root'
    );
  });

  it('can represent an explicitly empty trace fixture', () => {
    expect(makeOtlpTrace([])).toEqual({ resourceSpans: [] });
  });
});

describe('makeTrace', () => {
  it('parses brief specs into an IOtelTrace with tree, timing, and services', () => {
    const trace = makeTrace([
      { id: 'root', service: 'frontend', name: 'GET /', start: 0, duration: 9000 },
      { id: 'child', parent: 'root', service: 'cart', start: 1000, duration: 2000 },
      { id: 'grandchild', parent: 'child', service: 'cart', start: 1500, duration: 500 },
      { id: 'sibling', parent: 'root', service: 'frontend', start: 4000, duration: 1000 },
    ]);
    const span = (id: string) => trace.spanMap.get(spanIDForWire(id))!;

    expect(trace.traceID).toBe(DEFAULT_TRACE_ID);
    expect(trace.spans).toHaveLength(4);
    expect(trace.rootSpans.map(root => root.spanID)).toEqual([spanIDForWire('root')]);
    expect(span('grandchild').parentSpanID).toBe(spanIDForWire('child'));
    expect(span('grandchild').depth).toBe(2);
    expect(span('grandchild').duration).toBe(500);
    expect(span('sibling').relativeStartTime).toBe(4000);
    expect(span('root').kind).toBe(SpanKind.UNSPECIFIED);
    expect(trace.duration).toBe(9000);
    expect(trace.services).toEqual(
      expect.arrayContaining([
        { name: 'frontend', numberOfSpans: 2 },
        { name: 'cart', numberOfSpans: 2 },
      ])
    );
  });

  it('maps kind and status through the parser', () => {
    const trace = makeTrace([
      { id: 'root', kind: SpanKind.CLIENT, status: { code: StatusCode.ERROR, message: 'boom' } },
    ]);

    expect(trace.spans[0].kind).toBe(SpanKind.CLIENT);
    expect(trace.spans[0].status).toEqual({ code: StatusCode.ERROR, message: 'boom' });
  });

  it('throws for a fixture with no spans', () => {
    expect(() => makeTrace([])).toThrow('Trace fixture has no spans');
  });
});
