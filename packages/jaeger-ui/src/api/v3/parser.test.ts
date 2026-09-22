// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { SpanKind, StatusCode } from '../../types/otel';
import type { TracesDataWire } from './schemas';
import { parseOtelTrace } from './parser';

const TRACE_ID = 'abcdef0123456789abcdef0123456789';
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
      links: [{ traceId: TRACE_ID, spanId: CHILD_ID, attributes: [] }],
    });
    const trace = parseOtelTrace(traces([parent, lateChild, earlyChild]))!;

    const root = trace.spanMap.get(ROOT_ID)!;
    expect(trace.rootSpans).toEqual([root]);
    expect(root.childSpans.map(span => span.spanID)).toEqual([ORPHAN_ID, CHILD_ID]);
    expect(trace.spans.map(span => span.spanID)).toEqual([ROOT_ID, ORPHAN_ID, CHILD_ID]);
    expect(trace.spanMap.get(ORPHAN_ID)!.depth).toBe(1);
    expect(trace.spanMap.get(CHILD_ID)!.inboundLinks[0].spanID).toBe(ORPHAN_ID);
    expect(trace.services).toEqual([{ name: 'svc-a', numberOfSpans: 3 }]);
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
    expect(trace.spanMap.get(CYCLE_B_ID)!.parentSpan?.spanID).toBe(CYCLE_A_ID);
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
