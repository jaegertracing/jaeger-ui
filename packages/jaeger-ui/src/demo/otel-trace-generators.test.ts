// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { makeOtlpSpan, makeOtlpTrace } from './otel-trace-generators';
import { parseOtelTrace } from '../api/v3/parser';
import { refinedSpan, refinedTracesData, type SpanWire } from '../api/v3/schemas';
import { SpanKind } from '../types/otel';

const ROOT_ID = '1111111111111111';
const CHILD_ID = '2222222222222222';
const GRANDCHILD_ID = '3333333333333333';
const SIBLING_ID = '4444444444444444';

describe('makeOtlpSpan', () => {
  it('builds a valid root span with fixed timing and unspecified kind', () => {
    const span = refinedSpan.parse(makeOtlpSpan());

    expect(span.startTimeUnixNano).toBe('1000000');
    expect(span.endTimeUnixNano).toBe('2000000');
    expect(span).not.toHaveProperty('parentSpanId');
    expect(span).not.toHaveProperty('kind');
  });

  it('returns the same defaults regardless of the clock or previous calls', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);

    try {
      const first = makeOtlpSpan();
      makeOtlpSpan({ spanId: CHILD_ID, name: 'another operation' });
      now.mockReturnValue(1700000000000);

      expect(makeOtlpSpan()).toEqual(first);
    } finally {
      now.mockRestore();
    }
  });

  it('preserves explicit wire fields, including zero and empty values', () => {
    const overrides: Partial<SpanWire> = {
      traceId: '0123456789abcdef0123456789abcdef',
      spanId: CHILD_ID,
      parentSpanId: '',
      name: '',
      kind: 0,
      flags: 0,
      traceState: '',
      startTimeUnixNano: '0',
      endTimeUnixNano: '0',
      attributes: [{ key: 'enabled', value: { boolValue: false } }],
      events: [{ name: '', timeUnixNano: '0' }],
      links: [{ traceId: '0123456789abcdef0123456789abcdef', spanId: ROOT_ID }],
      status: { code: 0, message: '' },
    };
    Object.freeze(overrides);

    const span = makeOtlpSpan(overrides);

    expect(span).toMatchObject(overrides);
    expect(refinedSpan.safeParse(span).success).toBe(true);
  });

  it('preserves explicitly missing optional fields', () => {
    const overrides = {
      startTimeUnixNano: undefined,
      endTimeUnixNano: undefined,
      attributes: undefined,
      status: undefined,
    };

    expect(makeOtlpSpan(overrides)).toMatchObject(overrides);
  });

  it('does not share mutable defaults between spans', () => {
    const first = makeOtlpSpan();
    first.attributes!.push({ key: 'changed', value: { stringValue: 'value' } });
    first.events!.push({ name: 'changed' });
    first.links!.push({ traceId: first.traceId, spanId: CHILD_ID });
    first.status!.code = 2;

    const second = makeOtlpSpan();

    expect(second.attributes).toEqual([]);
    expect(second.events).toEqual([]);
    expect(second.links).toEqual([]);
    expect(second.status).toEqual({});
  });
});

describe('makeOtlpTrace', () => {
  it('generates OTLP wire data that parses into an IOtelTrace', () => {
    const spans = [
      makeOtlpSpan({ spanId: ROOT_ID, name: 'root' }),
      makeOtlpSpan({ spanId: CHILD_ID, parentSpanId: ROOT_ID }),
      makeOtlpSpan({ spanId: SIBLING_ID, parentSpanId: ROOT_ID }),
    ];
    const scope = { name: 'fixture-library', version: '1.0' };
    const wire = makeOtlpTrace(spans, { serviceName: 'checkout', scope });
    const trace = parseOtelTrace(refinedTracesData.parse(wire));

    expect(trace).not.toBeNull();
    expect(trace!.spans).toHaveLength(3);
    expect(trace!.spans.map(span => span.traceID)).toEqual([trace!.traceID, trace!.traceID, trace!.traceID]);
    expect(trace!.services).toEqual([{ name: 'checkout', numberOfSpans: 3 }]);
    expect(wire.resourceSpans![0].scopeSpans[0].scope).toEqual(scope);
    expect(wire.resourceSpans![0].scopeSpans[0].spans).toEqual(spans);
  });

  it('returns parsed traces for component tests', () => {
    const wire = makeOtlpTrace([
      makeOtlpSpan({ spanId: ROOT_ID, endTimeUnixNano: '10000000' }),
      makeOtlpSpan({
        spanId: CHILD_ID,
        parentSpanId: ROOT_ID,
        startTimeUnixNano: '2000000',
        endTimeUnixNano: '4000000',
      }),
      makeOtlpSpan({
        spanId: GRANDCHILD_ID,
        parentSpanId: CHILD_ID,
        startTimeUnixNano: '2500000',
        endTimeUnixNano: '3000000',
      }),
      makeOtlpSpan({
        spanId: SIBLING_ID,
        parentSpanId: ROOT_ID,
        startTimeUnixNano: '5000000',
        endTimeUnixNano: '6000000',
      }),
    ]);
    const trace = parseOtelTrace(refinedTracesData.parse(wire))!;

    expect(trace.spans).toHaveLength(4);
    expect(trace.spans.map(span => span.kind)).toEqual(Array(4).fill(SpanKind.UNSPECIFIED));
    expect(trace.rootSpans).not.toHaveLength(0);
    expect(
      trace.spans.every(span => span.parentSpanID === undefined || trace.spanMap.has(span.parentSpanID))
    ).toBe(true);
    expect(trace.rootSpans.map(span => span.spanID)).toEqual([ROOT_ID]);
    expect(trace.spanMap.get(CHILD_ID)!.parentSpanID).toBe(ROOT_ID);
    expect(trace.spanMap.get(GRANDCHILD_ID)!.parentSpanID).toBe(CHILD_ID);
    expect(trace.spanMap.get(GRANDCHILD_ID)!.depth).toBe(2);
    expect(trace.duration).toBe(9000);
    expect(trace.spanMap.get(GRANDCHILD_ID)!.duration).toBe(500);
  });

  it('keeps input order and isolates the span list and default resource metadata', () => {
    const spans = Object.freeze([
      makeOtlpSpan({ spanId: CHILD_ID, parentSpanId: ROOT_ID }),
      makeOtlpSpan({ spanId: ROOT_ID }),
    ]);
    const first = makeOtlpTrace(spans);
    const group = first.resourceSpans![0];
    expect(group.scopeSpans[0].spans).toEqual(spans);
    group.scopeSpans[0].spans.push(makeOtlpSpan({ spanId: SIBLING_ID }));
    group.resource!.attributes![0] = { key: 'service.name', value: { stringValue: 'changed' } };

    const second = makeOtlpTrace(spans);

    expect(spans).toHaveLength(2);
    expect(second.resourceSpans![0].scopeSpans[0].spans).toEqual(spans);
    expect(second.resourceSpans![0].resource!.attributes).toEqual([
      { key: 'service.name', value: { stringValue: 'service' } },
    ]);
    expect(second).toEqual(makeOtlpTrace(spans));
  });

  it('can represent an explicitly empty trace fixture', () => {
    const wire = makeOtlpTrace([]);

    expect(refinedTracesData.safeParse(wire).success).toBe(true);
    expect(parseOtelTrace(wire)).toBeNull();
  });
});
