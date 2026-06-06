// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, SpanKind, StatusCode } from '../types/otel';
import { toAnyValue, spanToOtlpJson, spanToFlatJson } from './span-to-otlp';

// Minimal factory — only set fields relevant to the test under examination
function makeSpan(overrides: Partial<IOtelSpan> = {}): IOtelSpan {
  return {
    traceID: 'aabbccddeeff0011',
    spanID: '1122334455667788',
    parentSpanID: 'aabbccddeeff0000',
    name: 'GET /api/v1/users',
    kind: SpanKind.SERVER,
    startTime: 1_700_000_000_000_000 as unknown as ReturnType<typeof Number>,
    endTime: 1_700_000_000_050_000 as unknown as ReturnType<typeof Number>,
    duration: 50_000 as unknown as ReturnType<typeof Number>,
    attributes: [
      { key: 'http.method', value: 'GET' },
      { key: 'http.status_code', value: 200 },
    ],
    events: [],
    links: [],
    status: { code: StatusCode.OK },
    resource: {
      serviceName: 'frontend',
      attributes: [{ key: 'service.name', value: 'frontend' }],
    },
    instrumentationScope: { name: 'go.opentelemetry.io/otel', version: '1.21.0' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: 0 as unknown as ReturnType<typeof Number>,
    inboundLinks: [],
    warnings: null,
    parentSpan: undefined,
    ...overrides,
  } as unknown as IOtelSpan;
}

// ---------------------------------------------------------------------------
// toAnyValue — OTLP AnyValue encoding
// ---------------------------------------------------------------------------

describe('toAnyValue', () => {
  it('encodes a string', () => {
    expect(toAnyValue('hello')).toEqual({ stringValue: 'hello' });
  });

  it('encodes a boolean true', () => {
    expect(toAnyValue(true)).toEqual({ boolValue: true });
  });

  it('encodes a boolean false', () => {
    expect(toAnyValue(false)).toEqual({ boolValue: false });
  });

  it('encodes an integer as intValue decimal string', () => {
    expect(toAnyValue(42)).toEqual({ intValue: '42' });
  });

  it('encodes a negative integer as intValue decimal string', () => {
    expect(toAnyValue(-7)).toEqual({ intValue: '-7' });
  });

  it('encodes a float as doubleValue number', () => {
    expect(toAnyValue(3.14)).toEqual({ doubleValue: 3.14 });
  });

  it('encodes NaN as stringValue (no OTLP representation for NaN)', () => {
    expect(toAnyValue(NaN)).toEqual({ stringValue: 'NaN' });
  });

  it('encodes Infinity as stringValue', () => {
    expect(toAnyValue(Infinity)).toEqual({ stringValue: 'Infinity' });
  });

  it('encodes a flat array', () => {
    expect(toAnyValue(['a', 'b'])).toEqual({
      arrayValue: { values: [{ stringValue: 'a' }, { stringValue: 'b' }] },
    });
  });

  it('encodes a mixed array recursively', () => {
    expect(toAnyValue([1, true, 'x'])).toEqual({
      arrayValue: {
        values: [{ intValue: '1' }, { boolValue: true }, { stringValue: 'x' }],
      },
    });
  });

  it('encodes a plain object as kvlistValue', () => {
    expect(toAnyValue({ x: 1, y: 'z' })).toEqual({
      kvlistValue: {
        values: [
          { key: 'x', value: { intValue: '1' } },
          { key: 'y', value: { stringValue: 'z' } },
        ],
      },
    });
  });

  it('encodes a Uint8Array as base64 bytesValue', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    expect(toAnyValue(bytes)).toEqual({ bytesValue: btoa('Hello') });
  });

  it('encodes null-ish values as empty stringValue', () => {
    // null is not in AttributeValue but defensive guard matters
    expect(toAnyValue(null as unknown as string)).toEqual({ stringValue: '' });
  });
});

// ---------------------------------------------------------------------------
// spanToOtlpJson — structural and spec-correctness tests
// ---------------------------------------------------------------------------

describe('spanToOtlpJson', () => {
  it('produces a top-level resourceSpans array with one entry', () => {
    const out = spanToOtlpJson(makeSpan());
    expect(Array.isArray(out.resourceSpans)).toBe(true);
    expect((out.resourceSpans as unknown[]).length).toBe(1);
  });

  it('maps resource attributes correctly', () => {
    const out = spanToOtlpJson(makeSpan());
    const rs = (out.resourceSpans as any)[0];
    expect(rs.resource.attributes).toEqual([{ key: 'service.name', value: { stringValue: 'frontend' } }]);
  });

  it('maps instrumentationScope name and version', () => {
    const out = spanToOtlpJson(makeSpan());
    const scope = (out.resourceSpans as any)[0].scopeSpans[0].scope;
    expect(scope.name).toBe('go.opentelemetry.io/otel');
    expect(scope.version).toBe('1.21.0');
  });

  it('omits scope.version when not present', () => {
    const out = spanToOtlpJson(makeSpan({ instrumentationScope: { name: 'my-lib' } }));
    const scope = (out.resourceSpans as any)[0].scopeSpans[0].scope;
    expect(scope).not.toHaveProperty('version');
  });

  it('sets traceId and spanId on the span', () => {
    const out = spanToOtlpJson(makeSpan());
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.traceId).toBe('aabbccddeeff0011');
    expect(span.spanId).toBe('1122334455667788');
  });

  it('includes parentSpanId when parentSpanID is set', () => {
    const out = spanToOtlpJson(makeSpan({ parentSpanID: 'parentabc' }));
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.parentSpanId).toBe('parentabc');
  });

  it('omits parentSpanId when parentSpanID is absent', () => {
    const out = spanToOtlpJson(makeSpan({ parentSpanID: undefined }));
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span).not.toHaveProperty('parentSpanId');
  });

  it.each([
    [SpanKind.INTERNAL, 1],
    [SpanKind.SERVER, 2],
    [SpanKind.CLIENT, 3],
    [SpanKind.PRODUCER, 4],
    [SpanKind.CONSUMER, 5],
  ])('encodes SpanKind.%s as integer %i', (kind, expected) => {
    const out = spanToOtlpJson(makeSpan({ kind }));
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.kind).toBe(expected);
  });

  it.each([
    [StatusCode.UNSET, 0],
    [StatusCode.OK, 1],
    [StatusCode.ERROR, 2],
  ])('encodes StatusCode.%s as integer %i', (code, expected) => {
    const out = spanToOtlpJson(makeSpan({ status: { code } }));
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.status.code).toBe(expected);
  });

  it('includes status.message when present', () => {
    const out = spanToOtlpJson(makeSpan({ status: { code: StatusCode.ERROR, message: 'timeout' } }));
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.status.message).toBe('timeout');
  });

  it('omits status.message when absent', () => {
    const out = spanToOtlpJson(makeSpan({ status: { code: StatusCode.OK } }));
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.status).not.toHaveProperty('message');
  });

  it('encodes startTimeUnixNano as nanosecond decimal string', () => {
    // startTime 1_700_000_000_000_000 µs × 1000 = 1_700_000_000_000_000_000 ns
    const out = spanToOtlpJson(makeSpan({ startTime: 1_700_000_000_000_000 as any }));
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.startTimeUnixNano).toBe('1700000000000000000');
    expect(typeof span.startTimeUnixNano).toBe('string');
  });

  it('encodes endTimeUnixNano as nanosecond decimal string', () => {
    const out = spanToOtlpJson(makeSpan({ endTime: 1_700_000_000_050_000 as any }));
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.endTimeUnixNano).toBe('1700000000050000000');
  });

  it('encodes span attributes using AnyValue encoding', () => {
    const out = spanToOtlpJson(makeSpan());
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.attributes).toEqual([
      { key: 'http.method', value: { stringValue: 'GET' } },
      { key: 'http.status_code', value: { intValue: '200' } },
    ]);
  });

  it('maps events with timestamp, name, and attributes', () => {
    const out = spanToOtlpJson(
      makeSpan({
        events: [
          {
            timestamp: 1_700_000_000_010_000 as any,
            name: 'db.query.start',
            attributes: [{ key: 'db.statement', value: 'SELECT 1' }],
          },
        ],
      })
    );
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.events).toHaveLength(1);
    expect(span.events[0].timeUnixNano).toBe('1700000000010000000');
    expect(span.events[0].name).toBe('db.query.start');
    expect(span.events[0].attributes).toEqual([{ key: 'db.statement', value: { stringValue: 'SELECT 1' } }]);
  });

  it('maps links with traceId, spanId, and attributes', () => {
    const out = spanToOtlpJson(
      makeSpan({
        links: [
          {
            traceID: 'linkedtrace001',
            spanID: 'linkedspan001',
            attributes: [{ key: 'link.type', value: 'follows_from' }],
          },
        ],
      })
    );
    const span = (out.resourceSpans as any)[0].scopeSpans[0].spans[0];
    expect(span.links).toHaveLength(1);
    expect(span.links[0].traceId).toBe('linkedtrace001');
    expect(span.links[0].spanId).toBe('linkedspan001');
    expect(span.links[0].attributes).toEqual([{ key: 'link.type', value: { stringValue: 'follows_from' } }]);
  });
});

// ---------------------------------------------------------------------------
// spanToFlatJson — human-readable debug format
// ---------------------------------------------------------------------------

describe('spanToFlatJson', () => {
  it('includes traceId, spanId, service, name, kind', () => {
    const out = spanToFlatJson(makeSpan());
    expect(out.traceId).toBe('aabbccddeeff0011');
    expect(out.spanId).toBe('1122334455667788');
    expect(out.service).toBe('frontend');
    expect(out.name).toBe('GET /api/v1/users');
    expect(out.kind).toBe(SpanKind.SERVER);
  });

  it('converts startTimeMs to milliseconds', () => {
    const out = spanToFlatJson(makeSpan({ startTime: 1_500_000 as any }));
    expect(out.startTimeMs).toBe(1500);
  });

  it('converts durationMs to milliseconds', () => {
    const out = spanToFlatJson(makeSpan({ duration: 50_000 as any }));
    expect(out.durationMs).toBe(50);
  });

  it('flattens attributes into a plain object', () => {
    const out = spanToFlatJson(makeSpan());
    expect(out.attributes).toEqual({ 'http.method': 'GET', 'http.status_code': 200 });
  });

  it('includes parentSpanId when parentSpanID is set', () => {
    const out = spanToFlatJson(makeSpan({ parentSpanID: 'p001' }));
    expect(out.parentSpanId).toBe('p001');
  });

  it('omits parentSpanId when parentSpanID is absent', () => {
    const out = spanToFlatJson(makeSpan({ parentSpanID: undefined }));
    expect(out).not.toHaveProperty('parentSpanId');
  });

  it('maps events with name, timestampMs, and flat attributes', () => {
    const out = spanToFlatJson(
      makeSpan({
        events: [
          {
            timestamp: 2_000_000 as any,
            name: 'cache.hit',
            attributes: [{ key: 'cache.key', value: 'user:42' }],
          },
        ],
      })
    );
    const events = out.events as any[];
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('cache.hit');
    expect(events[0].timestampMs).toBe(2000);
    expect(events[0].attributes).toEqual({ 'cache.key': 'user:42' });
  });

  it('includes status.message when present', () => {
    const out = spanToFlatJson(
      makeSpan({ status: { code: StatusCode.ERROR, message: 'deadline exceeded' } })
    );
    expect((out.status as any).message).toBe('deadline exceeded');
  });
});
