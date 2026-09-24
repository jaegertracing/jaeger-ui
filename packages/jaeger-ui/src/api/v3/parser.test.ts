// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind, StatusCode } from '../../types/otel';
import { GetTraceResponseSchema, type TracesDataWire } from './schemas';
import { parseOtelTrace } from './parser';
import capture from './v3-trace-output.json';

const TRACE_ID = 'abcdef0123456789abcdef0123456789';
const OTHER_TRACE_ID = '0123456789abcdef0123456789abcdef';
const ROOT_ID = '1111111111111111';
const CHILD_ID = '2222222222222222';
const ORPHAN_ID = '3333333333333333';
const CYCLE_A_ID = '4444444444444444';
const CYCLE_B_ID = '5555555555555555';

type ResourceSpansWire = NonNullable<TracesDataWire['resourceSpans']>;
type ResourceSpanWire = ResourceSpansWire[number];
type ScopeSpansWire = ResourceSpanWire['scopeSpans'][number];
type SpanWire = ScopeSpansWire['spans'][number];

function makeSpan(overrides: Partial<SpanWire> = {}): SpanWire {
  return {
    traceId: TRACE_ID,
    spanId: ROOT_ID,
    name: 'operation',
    kind: 1,
    startTimeUnixNano: '1000000',
    endTimeUnixNano: '2000000',
    ...overrides,
  };
}

function traces(spans: SpanWire[], serviceName = 'svc-a'): TracesDataWire {
  return {
    resourceSpans: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: serviceName } }] },
        scopeSpans: [{ scope: { name: 'instrumentation', version: '1.0' }, spans }],
      },
    ],
  };
}

describe('parseOtelTrace', () => {
  it('returns null when no spans can be placed on the timeline', () => {
    expect(parseOtelTrace({})).toBeNull();
    expect(parseOtelTrace(traces([]))).toBeNull();
    expect(parseOtelTrace(traces([makeSpan({ startTimeUnixNano: undefined })]))).toBeNull();
  });

  it('parses the captured API v3 payload into an enriched trace', () => {
    const parsed = GetTraceResponseSchema.parse(capture);
    const trace = parseOtelTrace(parsed.result)!;

    expect(trace.traceID).toBe('0123456789abcdef0123456789abcdef');
    expect(trace.spans).toHaveLength(3);
    expect(trace.services).toEqual([{ name: 'lfx-wire-probe', numberOfSpans: 3 }]);

    const root = trace.spanMap.get('0123456789abcdef')!;
    expect(root.resource.serviceName).toBe('lfx-wire-probe');
    expect(root.instrumentationScope).toMatchObject({ name: 'lfx-proposal', version: '1.0.0' });
    expect(root.status).toEqual({ code: StatusCode.ERROR, message: 'probe error status' });
    expect(root.attributes.getValue('empty')).toBe('');
    expect(root.attributes.getValue('false')).toBe(false);
    expect(root.attributes.getValue('integer')).toBe(0);
    expect(root.attributes.getValue('array')).toEqual(['first', false, '9223372036854775807']);
    expect(root.childSpans.map(span => span.spanID)).toEqual(['1111111111111111', '2222222222222222']);

    expect(trace.spanMap.get('1111111111111111')!.status.code).toBe(StatusCode.UNSET);
    expect(trace.spanMap.get('2222222222222222')!.kind).toBe(SpanKind.SERVER);
  });

  it('maps OTLP fields, duration, attributes, events, status, and GenAI classification', () => {
    const trace = parseOtelTrace(
      traces([
        makeSpan({
          name: 'GET /api',
          kind: 2,
          startTimeUnixNano: '1000900',
          endTimeUnixNano: '2000400',
          attributes: [
            { key: 'empty', value: { stringValue: '' } },
            { key: 'false', value: { boolValue: false } },
            { key: 'zero', value: { intValue: '0' } },
            { key: 'large', value: { intValue: '9223372036854775807' } },
            { key: 'array', value: { arrayValue: {} } },
            {
              key: 'object',
              value: { kvlistValue: { values: [{ key: 'enabled', value: { boolValue: false } }] } },
            },
            { key: 'gen_ai.operation.name', value: { stringValue: 'chat' } },
          ],
          events: [{ timeUnixNano: '1500000', name: 'cache-miss', attributes: [] }],
          status: { code: 2, message: 'boom' },
        }),
      ])
    )!;

    const span = trace.spans[0];
    expect(span.kind).toBe(SpanKind.SERVER);
    expect(span.startTime).toBe(1000);
    expect(span.duration).toBe(999);
    expect(span.endTime).toBe(1999);
    expect(span.resource.serviceName).toBe('svc-a');
    expect(span.instrumentationScope.name).toBe('instrumentation');
    expect(span.events).toEqual([
      { timestamp: 1500, name: 'cache-miss', attributes: expect.objectContaining({ size: 0 }) },
    ]);
    expect(span.status).toEqual({ code: StatusCode.ERROR, message: 'boom' });
    expect(trace.hasErrors()).toBe(true);
    expect(trace.isGenAITrace).toBe(true);
    expect(span.genAIKind).toBe('LLM_CALL');
    expect(Object.fromEntries(span.attributes.entries().map(({ key, value }) => [key, value]))).toEqual({
      empty: '',
      false: false,
      zero: 0,
      large: '9223372036854775807',
      array: [],
      object: { enabled: false },
      'gen_ai.operation.name': 'chat',
    });
  });

  it('uses explicit fallbacks for missing names and unknown span kinds', () => {
    const data = traces([
      makeSpan({
        name: undefined,
        kind: 99,
        events: [{ timeUnixNano: '1500000', name: '', attributes: [] }],
      }),
    ]);
    data.resourceSpans![0].scopeSpans[0].scope = {};

    const span = parseOtelTrace(data)!.spans[0];
    expect(span.name).toBe('no-name');
    expect(span.kind).toBe(SpanKind.UNSPECIFIED);
    expect(span.instrumentationScope.name).toBe('no-name');
    expect(span.events[0].name).toBe('no-name');
  });

  it('builds sorted parent-child relationships, inbound links, and service counts', () => {
    const parent = makeSpan({ spanId: ROOT_ID, startTimeUnixNano: '1000000', endTimeUnixNano: '9000000' });
    const lateChild = makeSpan({
      spanId: CHILD_ID,
      parentSpanId: ROOT_ID,
      startTimeUnixNano: '5000000',
      endTimeUnixNano: '6000000',
    });
    const earlyChild = makeSpan({
      spanId: ORPHAN_ID,
      parentSpanId: ROOT_ID,
      startTimeUnixNano: '2000000',
      endTimeUnixNano: '3000000',
      links: [
        { traceId: TRACE_ID, spanId: CHILD_ID, attributes: [] },
        { traceId: OTHER_TRACE_ID, spanId: CHILD_ID, attributes: [] },
      ],
    });
    const trace = parseOtelTrace(traces([parent, lateChild, earlyChild]))!;

    const root = trace.spanMap.get(ROOT_ID)!;
    expect(trace.rootSpans).toEqual([root]);
    expect(root.childSpans.map(span => span.spanID)).toEqual([ORPHAN_ID, CHILD_ID]);
    expect(trace.spans.map(span => span.spanID)).toEqual([ROOT_ID, ORPHAN_ID, CHILD_ID]);
    expect(trace.spanMap.get(ORPHAN_ID)!.depth).toBe(1);
    expect(trace.spanMap.get(CHILD_ID)!.inboundLinks[0].spanID).toBe(ORPHAN_ID);
    expect(trace.spanMap.get(CHILD_ID)!.inboundLinks).toHaveLength(1);
    expect(trace.spanMap.get(ORPHAN_ID)!.links[0].span?.spanID).toBe(CHILD_ID);
    expect(trace.spanMap.get(ORPHAN_ID)!.links[1].span).toBeUndefined();
    expect(trace.services).toEqual([{ name: 'svc-a', numberOfSpans: 3 }]);
  });

  it('rejects spans from different traces', () => {
    expect(() =>
      parseOtelTrace(
        traces([
          makeSpan({ spanId: ROOT_ID }),
          makeSpan({ spanId: CHILD_ID, traceId: OTHER_TRACE_ID, parentSpanId: ROOT_ID }),
        ])
      )
    ).toThrow(`Expected one trace ID, received ${TRACE_ID} and ${OTHER_TRACE_ID}`);
  });

  it('rejects timestamps outside the safe microsecond range', () => {
    const timestamp = '9007199254740992000';
    expect(() =>
      parseOtelTrace(traces([makeSpan({ startTimeUnixNano: timestamp, endTimeUnixNano: timestamp })]))
    ).toThrow('OTLP timestamp exceeds the safe integer range in microseconds');
  });

  it('assigns stable internal IDs to duplicate wire span IDs', () => {
    const duplicateID = `${ROOT_ID}_1`;
    const trace = parseOtelTrace(
      traces([
        makeSpan({ spanId: ROOT_ID, name: 'first', startTimeUnixNano: '1000000' }),
        makeSpan({ spanId: ROOT_ID, name: 'duplicate', startTimeUnixNano: '3000000' }),
        makeSpan({
          spanId: CHILD_ID,
          parentSpanId: ROOT_ID,
          name: 'child',
          startTimeUnixNano: '2000000',
          links: [{ traceId: TRACE_ID, spanId: ROOT_ID, attributes: [] }],
        }),
      ])
    )!;

    const first = trace.spanMap.get(ROOT_ID)!;
    const duplicate = trace.spanMap.get(duplicateID)!;
    const child = trace.spanMap.get(CHILD_ID)!;

    expect(trace.spans.map(span => span.spanID)).toEqual([ROOT_ID, CHILD_ID, duplicateID]);
    expect(trace.spanMap.size).toBe(3);
    expect(first.name).toBe('first');
    expect(duplicate.name).toBe('duplicate');
    expect(trace.rootSpans.map(span => span.spanID)).toEqual([ROOT_ID, duplicateID]);
    expect(child.parentSpan).toBe(first);
    expect(child.links[0].span).toBe(first);
  });

  it('keeps orphan spans and breaks parent cycles into traversable roots', () => {
    const trace = parseOtelTrace(
      traces([
        makeSpan({ spanId: ROOT_ID }),
        makeSpan({ spanId: ORPHAN_ID, parentSpanId: 'deadbeefdeadbeef' }),
        makeSpan({ spanId: CYCLE_A_ID, parentSpanId: CYCLE_B_ID }),
        makeSpan({ spanId: CYCLE_B_ID, parentSpanId: CYCLE_A_ID }),
      ])
    )!;

    expect(trace.orphanSpanCount).toBe(1);
    expect(trace.spans).toHaveLength(4);
    expect(new Set(trace.spans.map(span => span.spanID))).toEqual(
      new Set([ROOT_ID, ORPHAN_ID, CYCLE_A_ID, CYCLE_B_ID])
    );
    expect(trace.rootSpans.map(span => span.spanID)).toContain(CYCLE_A_ID);
    expect(trace.spanMap.get(CYCLE_A_ID)!.parentSpan).toBeUndefined();
    expect(trace.spanMap.get(CYCLE_A_ID)!.parentSpanID).toBeUndefined();
    expect(trace.spanMap.get(CYCLE_B_ID)!.parentSpan?.spanID).toBe(CYCLE_A_ID);
  });

  it('uses a genuine top-level span for trace metadata before an earlier orphan', () => {
    const trace = parseOtelTrace(
      traces([
        makeSpan({ spanId: ROOT_ID, name: 'root', startTimeUnixNano: '2000000' }),
        makeSpan({
          spanId: ORPHAN_ID,
          parentSpanId: 'deadbeefdeadbeef',
          name: 'orphan',
          startTimeUnixNano: '1000000',
        }),
      ])
    )!;

    expect(trace.rootSpans[0].spanID).toBe(ORPHAN_ID);
    expect(trace.traceName).toBe('svc-a: root');
    expect(trace.tracePageTitle).toBe('root (svc-a)');
  });

  it('uses an iterative traversal for deep hierarchies', () => {
    const spanCount = 5000;
    const spans = Array.from({ length: spanCount }, (_, index) => {
      const spanId = index.toString(16).padStart(16, '0');
      const parentSpanId = index === 0 ? undefined : (index - 1).toString(16).padStart(16, '0');
      const start = 1_000_000 + index * 1_000;
      return makeSpan({
        spanId,
        parentSpanId,
        startTimeUnixNano: String(start),
        endTimeUnixNano: String(start + 1_000),
      });
    });

    const trace = parseOtelTrace(traces(spans))!;
    expect(trace.spans).toHaveLength(spanCount);
    expect(trace.spans.at(-1)?.depth).toBe(spanCount - 1);
  });
});
