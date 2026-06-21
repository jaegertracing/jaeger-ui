// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { parseOtelTrace, IOtlpTracesData } from './parser';
import { SpanKind, StatusCode } from '../../types/otel';
import realResponse from './__fixtures__/getTrace-response.json';

const TRACE = 'abcdef0123456789abcdef0123456789';
const S1 = '1111111111111111';
const S2 = '2222222222222222';
const S3 = '3333333333333333';

type OtlpSpan = NonNullable<
  NonNullable<NonNullable<IOtlpTracesData['resourceSpans']>[number]['scopeSpans']>[number]['spans']
>[number];

function makeSpan(overrides: Partial<OtlpSpan> = {}): OtlpSpan {
  return {
    traceId: TRACE,
    spanId: S1,
    name: 'op',
    kind: 1,
    startTimeUnixNano: '1000000', // 1000 µs
    endTimeUnixNano: '2000000', // 2000 µs
    ...overrides,
  };
}

function otlp(spans: OtlpSpan[], serviceName = 'svc-a'): IOtlpTracesData {
  return {
    resourceSpans: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: serviceName } }] },
        scopeSpans: [{ scope: { name: 'lib', version: '1.0' }, spans }],
      },
    ],
  };
}

describe('parseOtelTrace', () => {
  it('returns null when there are no spans', () => {
    expect(parseOtelTrace({})).toBeNull();
    expect(parseOtelTrace({ resourceSpans: [] })).toBeNull();
    expect(parseOtelTrace(otlp([]))).toBeNull();
  });

  it('maps core fields and converts nanoseconds to microseconds', () => {
    const trace = parseOtelTrace(otlp([makeSpan({ name: 'GET /api', kind: 2 })]))!;
    expect(trace.traceID).toBe(TRACE);
    expect(trace.spans).toHaveLength(1);
    const span = trace.spans[0];
    expect(span.spanID).toBe(S1);
    expect(span.name).toBe('GET /api');
    expect(span.kind).toBe(SpanKind.SERVER);
    expect(span.startTime).toBe(1000);
    expect(span.endTime).toBe(2000);
    expect(span.duration).toBe(1000);
    expect(span.resource.serviceName).toBe('svc-a');
    expect(span.instrumentationScope).toEqual({ name: 'lib', version: '1.0', attributes: undefined });
    expect(trace.duration).toBe(1000);
    expect(trace.startTime).toBe(1000);
    expect(trace.endTime).toBe(2000);
    expect(trace.traceName).toBe('svc-a: GET /api');
    expect(trace.tracePageTitle).toBe('GET /api (svc-a)');
    expect(trace.traceEmoji).toBeTruthy();
  });

  it('derives duration from the nanosecond difference, not the difference of truncated µs', () => {
    // start 1_000_900ns → 1000µs; (end−start) = 999_500ns → 999µs.
    // Naively flooring each side first would yield 2000−1000 = 1000µs (1µs too high).
    const trace = parseOtelTrace(
      otlp([makeSpan({ startTimeUnixNano: '1000900', endTimeUnixNano: '2000400' })])
    )!;
    const span = trace.spans[0];
    expect(span.startTime).toBe(1000);
    expect(span.duration).toBe(999);
    expect(span.endTime).toBe(1999); // startTime + duration
  });

  it('lowercases trace, span, and parent ids', () => {
    const trace = parseOtelTrace(
      otlp([makeSpan({ spanId: 'AABBCCDDEEFF0011', parentSpanId: 'FF00FF00FF00FF00' })])
    )!;
    expect(trace.spans[0].spanID).toBe('aabbccddeeff0011');
    expect(trace.spans[0].parentSpanID).toBe('ff00ff00ff00ff00');
  });

  it('maps all span kinds', () => {
    const kinds: [number | undefined, SpanKind][] = [
      [0, SpanKind.INTERNAL],
      [1, SpanKind.INTERNAL],
      [2, SpanKind.SERVER],
      [3, SpanKind.CLIENT],
      [4, SpanKind.PRODUCER],
      [5, SpanKind.CONSUMER],
      [undefined, SpanKind.INTERNAL],
    ];
    kinds.forEach(([wire, expected]) => {
      const trace = parseOtelTrace(otlp([makeSpan({ kind: wire })]))!;
      expect(trace.spans[0].kind).toBe(expected);
    });
  });

  it('maps status codes and reports trace-level errors', () => {
    expect(parseOtelTrace(otlp([makeSpan({ status: { code: 0 } })]))!.spans[0].status.code).toBe(
      StatusCode.UNSET
    );
    expect(parseOtelTrace(otlp([makeSpan({ status: { code: 1 } })]))!.spans[0].status.code).toBe(
      StatusCode.OK
    );

    const errTrace = parseOtelTrace(otlp([makeSpan({ status: { code: 2, message: 'boom' } })]))!;
    expect(errTrace.spans[0].status).toEqual({ code: StatusCode.ERROR, message: 'boom' });
    expect(errTrace.hasErrors()).toBe(true);
    expect(parseOtelTrace(otlp([makeSpan({ status: { code: 1 } })]))!.hasErrors()).toBe(false);
  });

  it('converts every OTLP attribute value type', () => {
    const trace = parseOtelTrace(
      otlp([
        makeSpan({
          attributes: [
            { key: 'str', value: { stringValue: 'hello' } },
            { key: 'bool', value: { boolValue: true } },
            { key: 'int', value: { intValue: '42' } },
            { key: 'double', value: { doubleValue: 3.5 } },
            { key: 'bytes', value: { bytesValue: 'AAEC' } },
            { key: 'arr', value: { arrayValue: { values: [{ stringValue: 'a' }, { intValue: '2' }] } } },
            {
              key: 'kv',
              value: { kvlistValue: { values: [{ key: 'inner', value: { boolValue: false } }] } },
            },
          ],
        }),
      ])
    )!;
    const attrs = Object.fromEntries(trace.spans[0].attributes.map(a => [a.key, a.value]));
    expect(attrs.str).toBe('hello');
    expect(attrs.bool).toBe(true);
    expect(attrs.int).toBe(42);
    expect(attrs.double).toBe(3.5);
    expect(attrs.bytes).toBe('AAEC');
    expect(attrs.arr).toEqual(['a', 2]);
    expect(attrs.kv).toEqual({ inner: false });
  });

  it('maps events with a name fallback', () => {
    const trace = parseOtelTrace(
      otlp([
        makeSpan({
          events: [
            {
              timeUnixNano: '1500000',
              name: 'cache-miss',
              attributes: [{ key: 'k', value: { stringValue: 'v' } }],
            },
            { timeUnixNano: '1600000' },
          ],
        }),
      ])
    )!;
    const [e1, e2] = trace.spans[0].events;
    expect(e1).toEqual({ timestamp: 1500, name: 'cache-miss', attributes: [{ key: 'k', value: 'v' }] });
    expect(e2.name).toBe('log');
    expect(e2.timestamp).toBe(1600);
  });

  it('wires parent/child, depth, relative start, and sorts children by start time', () => {
    const parent = makeSpan({ spanId: S1, startTimeUnixNano: '1000000', endTimeUnixNano: '9000000' });
    const lateChild = makeSpan({
      spanId: S2,
      parentSpanId: S1,
      startTimeUnixNano: '5000000',
      endTimeUnixNano: '6000000',
    });
    const earlyChild = makeSpan({
      spanId: S3,
      parentSpanId: S1,
      startTimeUnixNano: '2000000',
      endTimeUnixNano: '3000000',
    });
    const trace = parseOtelTrace(otlp([parent, lateChild, earlyChild]))!;

    expect(trace.rootSpans).toHaveLength(1);
    expect(trace.rootSpans[0].spanID).toBe(S1);
    expect(trace.orphanSpanCount).toBe(0);

    const root = trace.spanMap.get(S1)!;
    expect(root.depth).toBe(0);
    expect(root.hasChildren).toBe(true);
    expect(root.relativeStartTime).toBe(0);
    // children sorted by startTime: early (S3) before late (S2)
    expect(root.childSpans.map(c => c.spanID)).toEqual([S3, S2]);
    const child = trace.spanMap.get(S3)!;
    expect(child.depth).toBe(1);
    expect(child.parentSpan?.spanID).toBe(S1);
    expect(child.relativeStartTime).toBe(1000); // 2000µs - 1000µs trace start
    // DFS pre-order flat list: parent, early child, late child
    expect(trace.spans.map(s => s.spanID)).toEqual([S1, S3, S2]);
  });

  it('counts orphan spans whose parent is absent and treats them as roots', () => {
    const orphan = makeSpan({ spanId: S2, parentSpanId: 'deadbeefdeadbeef' });
    const trace = parseOtelTrace(otlp([makeSpan({ spanId: S1 }), orphan]))!;
    expect(trace.orphanSpanCount).toBe(1);
    expect(trace.rootSpans.map(s => s.spanID).sort()).toEqual([S1, S2].sort());
  });

  it('builds inbound links from outbound span links', () => {
    const a = makeSpan({ spanId: S1, links: [{ traceId: TRACE, spanId: S2 }] });
    const b = makeSpan({ spanId: S2, startTimeUnixNano: '1500000', endTimeUnixNano: '2500000' });
    const trace = parseOtelTrace(otlp([a, b]))!;
    const spanA = trace.spanMap.get(S1)!;
    const spanB = trace.spanMap.get(S2)!;
    expect(spanA.links[0].spanID).toBe(S2);
    expect(spanA.links[0].span?.spanID).toBe(S2);
    expect(spanB.inboundLinks).toHaveLength(1);
    expect(spanB.inboundLinks[0].spanID).toBe(S1);
    expect(spanB.inboundLinks[0].span?.spanID).toBe(S1);
  });

  it('aggregates per-service span counts across resources', () => {
    const data: IOtlpTracesData = {
      resourceSpans: [
        ...otlp([makeSpan({ spanId: S1 })], 'svc-a').resourceSpans!,
        ...otlp(
          [makeSpan({ spanId: S2, parentSpanId: S1 }), makeSpan({ spanId: S3, parentSpanId: S1 })],
          'svc-b'
        ).resourceSpans!,
      ],
    };
    const trace = parseOtelTrace(data)!;
    const services = Object.fromEntries(trace.services.map(s => [s.name, s.numberOfSpans]));
    expect(services).toEqual({ 'svc-a': 1, 'svc-b': 2 });
  });

  it('skips spans missing a trace id, span id, or start time', () => {
    const trace = parseOtelTrace(
      otlp([
        makeSpan({ spanId: S1 }),
        makeSpan({ spanId: undefined }),
        makeSpan({ spanId: S2, startTimeUnixNano: undefined }),
        makeSpan({ spanId: S3, traceId: undefined }),
      ])
    )!;
    expect(trace.spans).toHaveLength(1);
    expect(trace.spans[0].spanID).toBe(S1);
  });

  it('keeps large int64 attribute values as strings to avoid precision loss', () => {
    const trace = parseOtelTrace(
      otlp([
        makeSpan({
          attributes: [
            { key: 'big', value: { intValue: '9223372036854775807' } }, // > Number.MAX_SAFE_INTEGER
            { key: 'small', value: { intValue: '123' } },
          ],
        }),
      ])
    )!;
    const attrs = Object.fromEntries(trace.spans[0].attributes.map(a => [a.key, a.value]));
    expect(attrs.big).toBe('9223372036854775807');
    expect(attrs.small).toBe(123);
  });

  it('drops attributes whose value is absent rather than inventing an empty string', () => {
    const trace = parseOtelTrace(
      otlp([makeSpan({ attributes: [{ key: 'present', value: { stringValue: 'v' } }, { key: 'absent' }] })])
    )!;
    expect(trace.spans[0].attributes).toEqual([{ key: 'present', value: 'v' }]);
  });

  it('parses a real /api/v3/traces response with parity to the legacy span count', () => {
    const trace = parseOtelTrace((realResponse as { result: IOtlpTracesData }).result)!;
    expect(trace).not.toBeNull();
    // Same 40 spans the legacy /api/traces endpoint returns for this trace.
    expect(trace.spans).toHaveLength(40);
    expect(trace.spanMap.size).toBe(40);
    expect(trace.traceID).toBe('2ea75461946a7dd10f2c15ab36a076cb');
    expect(trace.rootSpans.length).toBeGreaterThan(0);
    expect(trace.duration).toBeGreaterThan(0);
    expect(trace.services.reduce((n, s) => n + s.numberOfSpans, 0)).toBe(40);
    expect(trace.services.map(s => s.name).sort()).toEqual(
      ['customer', 'driver', 'frontend', 'mysql', 'redis-manual', 'route'].sort()
    );
    // Every span got a finite depth and a parent (except roots).
    trace.spans.forEach(s => {
      expect(Number.isFinite(s.depth)).toBe(true);
      if (s.depth > 0) expect(s.parentSpan).toBeDefined();
    });
  });
});
