// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  FIXTURE_BASE_TIME,
  makeOtlpSpan,
  makeOtlpTrace,
  makeTrace,
  type IOtlpSpanSpec,
} from './otlp-builders';
import { spanIDForWire } from './materializer-otlp';
import { refinedSpan, refinedTracesData } from '../../api/v3/schemas';
import { SpanKind, StatusCode } from '../../types/otel';

const TRACE_ID = 'abcdef0123456789abcdef0123456789';
const OTHER_TRACE_ID = '0123456789abcdef0123456789abcdef';

/** Nanosecond wire timestamp for a microsecond offset from the fixture base. */
const ns = (offset: number) => ((BigInt(FIXTURE_BASE_TIME) + BigInt(offset)) * 1000n).toString();

describe('makeOtlpSpan', () => {
  it('expands a span id into a valid span with fixed defaults', () => {
    const span = makeOtlpSpan({ id: 'root' });

    expect(refinedSpan.safeParse(span).success).toBe(true);
    expect(span).toEqual({
      traceId: TRACE_ID,
      spanId: spanIDForWire('root'),
      name: 'operation',
      startTimeUnixNano: ns(0),
      endTimeUnixNano: ns(1000),
      attributes: [],
      events: [],
      links: [],
      status: {},
    });
  });

  it('returns equal spans for equal input', () => {
    const spec: IOtlpSpanSpec = { id: 'root', attributes: { a: 1 }, events: [{ time: 5 }] };

    expect(makeOtlpSpan(spec)).toEqual(makeOtlpSpan(spec));
  });

  it('converts brief fields to wire encoding', () => {
    const span = makeOtlpSpan(
      {
        id: 'child',
        parent: 'root',
        name: 'GET /cart',
        kind: SpanKind.SERVER,
        start: 10,
        duration: 250,
        attributes: { 'http.method': 'GET', 'http.status_code': 200, ratio: 0.5, cached: false, empty: '' },
        events: [{ name: 'retry', time: 100, attributes: { attempt: 2 } }, { time: 0 }],
        links: [{ id: 'other', traceId: OTHER_TRACE_ID.toUpperCase(), attributes: { kind: 'batch' } }],
        status: { code: StatusCode.ERROR, message: 'timeout' },
      },
      OTHER_TRACE_ID
    );

    expect(refinedSpan.safeParse(span).success).toBe(true);
    expect(span).toEqual({
      traceId: OTHER_TRACE_ID,
      spanId: spanIDForWire('child'),
      parentSpanId: spanIDForWire('root'),
      name: 'GET /cart',
      kind: 2,
      startTimeUnixNano: ns(10),
      endTimeUnixNano: ns(260),
      attributes: [
        { key: 'http.method', value: { stringValue: 'GET' } },
        { key: 'http.status_code', value: { intValue: '200' } },
        { key: 'ratio', value: { doubleValue: 0.5 } },
        { key: 'cached', value: { boolValue: false } },
        { key: 'empty', value: { stringValue: '' } },
      ],
      events: [
        { name: 'retry', timeUnixNano: ns(100), attributes: [{ key: 'attempt', value: { intValue: '2' } }] },
        { timeUnixNano: ns(0), attributes: [] },
      ],
      links: [
        {
          traceId: OTHER_TRACE_ID,
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
    expect(span.links).toEqual([{ traceId: TRACE_ID, spanId: spanIDForWire('root'), attributes: [] }]);
  });

  it('sends warnings as the reserved attribute after the span attributes', () => {
    const span = makeOtlpSpan({ id: 'root', attributes: { a: 'b' }, warnings: ['first', 'second'] });

    expect(span.attributes).toEqual([
      { key: 'a', value: { stringValue: 'b' } },
      {
        key: '@jaeger@warnings',
        value: { arrayValue: { values: [{ stringValue: 'first' }, { stringValue: 'second' }] } },
      },
    ]);
  });

  it('omits the status message when none is given', () => {
    expect(makeOtlpSpan({ id: 'root', status: { code: StatusCode.OK } }).status).toEqual({ code: 1 });
  });

  it.each([
    ['a negative start', { start: -1 }, 'start must be a non-negative integer'],
    ['a fractional duration', { duration: 1.5 }, 'duration must be a non-negative integer'],
    ['an unsafe event time', { events: [{ time: Number.MAX_SAFE_INTEGER + 1 }] }, 'event time must be'],
    [
      'an end past the safe range',
      { duration: Number.MAX_SAFE_INTEGER - FIXTURE_BASE_TIME + 1 },
      'end is beyond',
    ],
    [
      'an event past the safe range',
      { events: [{ time: Number.MAX_SAFE_INTEGER - FIXTURE_BASE_TIME + 1 }] },
      'event time is beyond',
    ],
    ['a NaN attribute', { attributes: { ratio: NaN } }, 'attribute ratio must be a finite number'],
    [
      'an infinite event attribute',
      { events: [{ time: 0, attributes: { n: Infinity } }] },
      'attribute n must be',
    ],
    ['a non-hex link trace ID', { links: [{ id: 'root', traceId: 'trace-1' }] }, 'trace ID trace-1 must be'],
    ['a numeric kind from JavaScript', { kind: 2 as unknown as SpanKind }, 'unknown kind 2'],
    ['an unknown status code', { status: { code: 'FAILED' as StatusCode } }, 'unknown status code FAILED'],
  ])('rejects %s', (_, spec, message) => {
    expect(() => makeOtlpSpan({ id: 'bad', ...spec })).toThrow(`Invalid span bad: ${message}`);
  });

  it.each(['trace-1', '0'.repeat(32)])('rejects the trace ID %s', traceId => {
    expect(() => makeOtlpSpan({ id: 'root' }, traceId)).toThrow('Invalid span root: trace ID');
  });
});

describe('makeOtlpTrace', () => {
  it('groups consecutive spans of a service into one resource and keeps input order', () => {
    const scope = { name: 'fixture-library', version: '1.0' };
    const wire = makeOtlpTrace(
      [
        { id: 'root', service: 'frontend' },
        { id: 'render', parent: 'root', service: 'frontend' },
        { id: 'db', parent: 'root', service: 'mysql' },
        { id: 'paint', parent: 'root', service: 'frontend' },
        { id: 'default', parent: 'root' },
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
      { service: 'frontend', scope, spans: [spanIDForWire('paint')] },
      { service: 'service', scope, spans: [spanIDForWire('default')] },
    ]);
  });

  it('keeps sibling order for equal start times across services', () => {
    const trace = makeTrace([
      { id: 'root' },
      { id: 'a', parent: 'root', service: 'frontend' },
      { id: 'b', parent: 'root', service: 'mysql' },
      { id: 'c', parent: 'root', service: 'frontend' },
    ]);

    expect(trace.rootSpans[0].childSpans.map(span => span.spanID)).toEqual(
      ['a', 'b', 'c'].map(spanIDForWire)
    );
    expect(trace.services).toEqual(
      expect.arrayContaining([
        { name: 'frontend', numberOfSpans: 2 },
        { name: 'mysql', numberOfSpans: 1 },
      ])
    );
  });

  it('applies the trace id to every span', () => {
    const wire = makeOtlpTrace([{ id: 'root' }, { id: 'child', parent: 'root' }], {
      traceId: OTHER_TRACE_ID,
    });

    expect(wire.resourceSpans![0].scopeSpans[0].spans.map(span => span.traceId)).toEqual([
      OTHER_TRACE_ID,
      OTHER_TRACE_ID,
    ]);
  });

  it('rejects two ids that encode to the same span ID', () => {
    expect(() => makeOtlpTrace([{ id: 'abcdef0123456789' }, { id: 'ABCDEF0123456789' }])).toThrow(
      'Invalid span ABCDEF0123456789: duplicate span ID in trace fixture'
    );
  });

  it('rejects a parent that is not in the fixture', () => {
    expect(() => makeOtlpTrace([{ id: 'root' }, { id: 'child', parent: 'roott' }])).toThrow(
      'Invalid span child: parent roott is not in the fixture; pass allowMissingParents for an orphan'
    );
  });

  it('builds an orphan span when missing parents are allowed', () => {
    const wire = makeOtlpTrace([{ id: 'root' }, { id: 'orphan', parent: 'gone' }], {
      allowMissingParents: true,
    });

    expect(wire.resourceSpans![0].scopeSpans[0].spans[1].parentSpanId).toBe(spanIDForWire('gone'));
  });

  it('produces wire data the parser turns into the described tree and timing', () => {
    const trace = makeTrace([
      { id: 'root', service: 'frontend', name: 'GET /', start: 0, duration: 9000 },
      { id: 'child', parent: 'root', service: 'cart', start: 0, duration: 2000, events: [{ time: 0 }] },
      { id: 'grandchild', parent: 'child', service: 'cart', start: 1500, duration: 500 },
      {
        id: 'sibling',
        parent: 'root',
        service: 'frontend',
        start: 4000,
        duration: 1000,
        kind: SpanKind.CLIENT,
        status: { code: StatusCode.ERROR, message: 'boom' },
      },
    ]);
    const span = (id: string) => trace.spanMap.get(spanIDForWire(id))!;

    expect(trace.traceID).toBe(TRACE_ID);
    expect(trace.startTime).toBe(FIXTURE_BASE_TIME);
    expect(trace.duration).toBe(9000);
    expect(trace.rootSpans.map(root => root.spanID)).toEqual([spanIDForWire('root')]);
    expect(span('child').startTime).toBe(FIXTURE_BASE_TIME);
    expect(span('child').duration).toBe(2000);
    expect(span('child').events[0].timestamp).toBe(FIXTURE_BASE_TIME);
    expect(span('grandchild').parentSpanID).toBe(spanIDForWire('child'));
    expect(span('grandchild').depth).toBe(2);
    expect(span('grandchild').relativeStartTime).toBe(1500);
    expect(span('sibling').kind).toBe(SpanKind.CLIENT);
    expect(span('sibling').status).toEqual({ code: StatusCode.ERROR, message: 'boom' });
    expect(span('root').kind).toBe(SpanKind.UNSPECIFIED);
  });

  it('adds resource attributes to every resource after service.name', () => {
    const wire = makeOtlpTrace(
      [
        { id: 'a', service: 'x' },
        { id: 'b', service: 'y' },
      ],
      {
        resource: { hostname: 'h1', port: 8080 },
      }
    );

    expect(wire.resourceSpans!.map(group => group.resource!.attributes)).toEqual(
      ['x', 'y'].map(service => [
        { key: 'service.name', value: { stringValue: service } },
        { key: 'hostname', value: { stringValue: 'h1' } },
        { key: 'port', value: { intValue: '8080' } },
      ])
    );
  });

  it('rejects a non-finite resource attribute', () => {
    expect(() => makeOtlpTrace([{ id: 'a' }], { resource: { load: NaN } })).toThrow(
      'Invalid span resource: attribute load must be a finite number'
    );
  });

  it('can represent an explicitly empty trace fixture', () => {
    expect(makeOtlpTrace([])).toEqual({ resourceSpans: [] });
  });
});

describe('makeTrace', () => {
  it('parses warnings and resource attributes into the span', () => {
    const [span] = makeTrace([{ id: 'root', service: 'frontend', warnings: ['w1', 'w2'] }], {
      resource: { hostname: 'h1' },
    }).spans;

    expect(span.warnings).toEqual(['w1', 'w2']);
    expect(span.attributes.has('@jaeger@warnings')).toBe(false);
    expect(span.resource.serviceName).toBe('frontend');
    expect(span.resource.attributes.getValue('hostname')).toBe('h1');
  });

  it('throws for a fixture with no spans', () => {
    expect(() => makeTrace([])).toThrow('Trace fixture has no spans');
  });
});
