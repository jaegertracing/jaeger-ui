// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { parseOtlpTrace, OtlpTracesData } from './parser';
import { SpanKind, StatusCode } from '../../types/otel';

const BASE_NANO = '1000000000'; // 1e9 ns = 1e6 µs
const BASE_NANO_END = '2000000000'; // 2e9 ns = 2e6 µs

function makeSpan(
  overrides: Partial<{
    traceId: string;
    spanId: string;
    parentSpanId: string;
    name: string;
    kind: number;
    startTimeUnixNano: string;
    endTimeUnixNano: string;
    status: { code?: number; message?: string };
    attributes: { key: string; value: Record<string, unknown> }[];
    events: {
      timeUnixNano: string;
      name: string;
      attributes?: { key: string; value: Record<string, unknown> }[];
    }[];
    links: {
      traceId: string;
      spanId: string;
      attributes?: { key: string; value: Record<string, unknown> }[];
    }[];
  }> = {}
) {
  return {
    traceId: 'trace-abc',
    spanId: 'span-001',
    name: 'test-op',
    kind: 2,
    startTimeUnixNano: BASE_NANO,
    endTimeUnixNano: BASE_NANO_END,
    status: { code: 0 },
    ...overrides,
  };
}

function makeTrace(spans: ReturnType<typeof makeSpan>[], serviceName = 'test-svc'): OtlpTracesData {
  return {
    resourceSpans: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: serviceName } }] },
        scopeSpans: [{ scope: { name: 'test-scope' }, spans }],
      },
    ],
  };
}

describe('parseOtlpTrace', () => {
  describe('basic span fields', () => {
    it('maps traceId, spanId, name, and kind', () => {
      const trace = parseOtlpTrace(makeTrace([makeSpan()]));
      const span = trace.spans[0];
      expect(span.traceID).toBe('trace-abc');
      expect(span.spanID).toBe('span-001');
      expect(span.name).toBe('test-op');
      expect(span.kind).toBe(SpanKind.SERVER); // kind=2
    });

    it('converts nanosecond timestamps to microseconds', () => {
      const trace = parseOtlpTrace(makeTrace([makeSpan()]));
      const span = trace.spans[0];
      expect(span.startTime).toBe(1_000_000); // 1e9ns / 1000 = 1e6µs
      expect(span.endTime).toBe(2_000_000);
      expect(span.duration).toBe(1_000_000);
    });

    it('parses resource serviceName', () => {
      const trace = parseOtlpTrace(makeTrace([makeSpan()], 'my-service'));
      expect(trace.spans[0].resource.serviceName).toBe('my-service');
    });

    it('parses instrumentationScope', () => {
      const trace = parseOtlpTrace(makeTrace([makeSpan()]));
      expect(trace.spans[0].instrumentationScope.name).toBe('test-scope');
    });

    it('sets parentSpanID and leaves it undefined when absent', () => {
      const root = makeSpan({ spanId: 'root' });
      const child = makeSpan({ spanId: 'child', parentSpanId: 'root' });
      const trace = parseOtlpTrace(makeTrace([root, child]));
      const rootSpan = trace.spanMap.get('root')!;
      const childSpan = trace.spanMap.get('child')!;
      expect(rootSpan.parentSpanID).toBeUndefined();
      expect(childSpan.parentSpanID).toBe('root');
    });

    it('treats empty parentSpanId as no parent', () => {
      const span = makeSpan({ parentSpanId: '' });
      const trace = parseOtlpTrace(makeTrace([span]));
      expect(trace.spans[0].parentSpanID).toBeUndefined();
      expect(trace.rootSpans).toHaveLength(1);
    });
  });

  describe('SpanKind mapping', () => {
    const cases: [number, SpanKind][] = [
      [0, SpanKind.INTERNAL],
      [1, SpanKind.INTERNAL],
      [2, SpanKind.SERVER],
      [3, SpanKind.CLIENT],
      [4, SpanKind.PRODUCER],
      [5, SpanKind.CONSUMER],
    ];
    it.each(cases)('kind %i → %s', (input, expected) => {
      const trace = parseOtlpTrace(makeTrace([makeSpan({ kind: input })]));
      expect(trace.spans[0].kind).toBe(expected);
    });

    it('defaults unknown kind to INTERNAL', () => {
      const trace = parseOtlpTrace(makeTrace([makeSpan({ kind: 99 })]));
      expect(trace.spans[0].kind).toBe(SpanKind.INTERNAL);
    });
  });

  describe('StatusCode mapping', () => {
    const cases: [number, StatusCode][] = [
      [0, StatusCode.UNSET],
      [1, StatusCode.OK],
      [2, StatusCode.ERROR],
    ];
    it.each(cases)('code %i → %s', (code, expected) => {
      const trace = parseOtlpTrace(makeTrace([makeSpan({ status: { code } })]));
      expect(trace.spans[0].status.code).toBe(expected);
    });

    it('defaults empty status to UNSET', () => {
      const data: OtlpTracesData = {
        resourceSpans: [
          {
            resource: { attributes: [{ key: 'service.name', value: { stringValue: 'svc' } }] },
            scopeSpans: [
              {
                spans: [
                  {
                    traceId: 'tid',
                    spanId: 'sid',
                    name: 'op',
                    startTimeUnixNano: BASE_NANO,
                    endTimeUnixNano: BASE_NANO_END,
                    status: {},
                  },
                ],
              },
            ],
          },
        ],
      };
      const trace = parseOtlpTrace(data);
      expect(trace.spans[0].status.code).toBe(StatusCode.UNSET);
    });

    it('preserves status message', () => {
      const trace = parseOtlpTrace(
        makeTrace([makeSpan({ status: { code: 2, message: 'something failed' } })])
      );
      expect(trace.spans[0].status.message).toBe('something failed');
    });
  });

  describe('attribute value parsing', () => {
    function attrTrace(value: Record<string, unknown>) {
      return parseOtlpTrace(makeTrace([makeSpan({ attributes: [{ key: 'test.key', value }] })]));
    }

    it('parses stringValue', () => {
      expect(attrTrace({ stringValue: 'hello' }).spans[0].attributes[0].value).toBe('hello');
    });

    it('parses boolValue', () => {
      expect(attrTrace({ boolValue: true }).spans[0].attributes[0].value).toBe(true);
    });

    it('parses doubleValue', () => {
      expect(attrTrace({ doubleValue: 3.14 }).spans[0].attributes[0].value).toBe(3.14);
    });

    it('parses intValue as string', () => {
      expect(attrTrace({ intValue: '42' }).spans[0].attributes[0].value).toBe(42);
    });

    it('parses intValue as number', () => {
      expect(attrTrace({ intValue: 7 }).spans[0].attributes[0].value).toBe(7);
    });

    it('keeps large intValue as string when it exceeds safe integer range', () => {
      // 9007199254740993 = MAX_SAFE_INTEGER + 2; converting to Number loses precision
      expect(attrTrace({ intValue: '9007199254740993' }).spans[0].attributes[0].value).toBe(
        '9007199254740993'
      );
    });

    it('parses arrayValue', () => {
      const value = attrTrace({
        arrayValue: { values: [{ stringValue: 'a' }, { stringValue: 'b' }] },
      }).spans[0].attributes[0].value;
      expect(value).toEqual(['a', 'b']);
    });

    it('parses kvlistValue', () => {
      const value = attrTrace({
        kvlistValue: { values: [{ key: 'k1', value: { stringValue: 'v1' } }] },
      }).spans[0].attributes[0].value;
      expect(value).toEqual({ k1: 'v1' });
    });

    it('returns empty string for unknown value type', () => {
      expect(attrTrace({}).spans[0].attributes[0].value).toBe('');
    });

    it('parses bytesValue into a Uint8Array', () => {
      // base64 'aGk=' decodes to 'hi' (bytes 104, 105)
      const value = attrTrace({ bytesValue: 'aGk=' }).spans[0].attributes[0].value;
      expect(value).toBeInstanceOf(Uint8Array);
      expect(Array.from(value as Uint8Array)).toEqual([104, 105]);
    });
  });

  describe('parent-child tree', () => {
    it('wires parentSpan reference', () => {
      const root = makeSpan({ spanId: 'root' });
      const child = makeSpan({ spanId: 'child', parentSpanId: 'root' });
      const trace = parseOtlpTrace(makeTrace([root, child]));
      const childSpan = trace.spanMap.get('child')!;
      expect(childSpan.parentSpan?.spanID).toBe('root');
    });

    it('wires childSpans on parent', () => {
      const root = makeSpan({ spanId: 'root' });
      const child = makeSpan({ spanId: 'child', parentSpanId: 'root' });
      const trace = parseOtlpTrace(makeTrace([root, child]));
      const rootSpan = trace.spanMap.get('root')!;
      expect(rootSpan.hasChildren).toBe(true);
      expect(rootSpan.childSpans).toHaveLength(1);
      expect(rootSpan.childSpans[0].spanID).toBe('child');
    });

    it('assigns depth 0 to root and 1 to child', () => {
      const root = makeSpan({ spanId: 'root' });
      const child = makeSpan({ spanId: 'child', parentSpanId: 'root' });
      const grandchild = makeSpan({ spanId: 'grandchild', parentSpanId: 'child' });
      const trace = parseOtlpTrace(makeTrace([root, child, grandchild]));
      expect(trace.spanMap.get('root')!.depth).toBe(0);
      expect(trace.spanMap.get('child')!.depth).toBe(1);
      expect(trace.spanMap.get('grandchild')!.depth).toBe(2);
    });

    it('counts spans with missing parent as orphans', () => {
      const orphan = makeSpan({ spanId: 'orphan', parentSpanId: 'nonexistent' });
      const trace = parseOtlpTrace(makeTrace([orphan]));
      expect(trace.orphanSpanCount).toBe(1);
      expect(trace.rootSpans).toHaveLength(1);
    });
  });

  describe('inboundLinks', () => {
    it('adds an inbound link to the target span', () => {
      const target = makeSpan({ spanId: 'target' });
      const linker = makeSpan({
        spanId: 'linker',
        links: [{ traceId: 'trace-abc', spanId: 'target' }],
      });
      const trace = parseOtlpTrace(makeTrace([target, linker]));
      const targetSpan = trace.spanMap.get('target')!;
      expect(targetSpan.inboundLinks).toHaveLength(1);
      expect(targetSpan.inboundLinks[0].spanID).toBe('linker');
      expect(targetSpan.inboundLinks[0].span?.spanID).toBe('linker');
    });

    it('does not add inbound link for external trace references', () => {
      const linker = makeSpan({
        spanId: 'linker',
        links: [{ traceId: 'other-trace', spanId: 'external-span' }],
      });
      const trace = parseOtlpTrace(makeTrace([linker]));
      expect(trace.spans[0].inboundLinks).toHaveLength(0);
    });

    it('does not add inbound link when traceId differs even if spanId matches a local span', () => {
      const local = makeSpan({ spanId: 'local' });
      const linker = makeSpan({
        spanId: 'linker',
        links: [{ traceId: 'OTHER-TRACE', spanId: 'local' }],
      });
      const trace = parseOtlpTrace(makeTrace([local, linker]));
      expect(trace.spanMap.get('local')!.inboundLinks).toHaveLength(0);
    });
  });

  describe('events and links', () => {
    it('parses events', () => {
      const span = makeSpan({
        events: [
          { timeUnixNano: BASE_NANO, name: 'evt', attributes: [{ key: 'k', value: { stringValue: 'v' } }] },
        ],
      });
      const trace = parseOtlpTrace(makeTrace([span]));
      const evt = trace.spans[0].events[0];
      expect(evt.name).toBe('evt');
      expect(evt.timestamp).toBe(1_000_000);
      expect(evt.attributes[0].key).toBe('k');
    });

    it('parses outbound links', () => {
      const span = makeSpan({
        links: [
          { traceId: 'other', spanId: 'other-span', attributes: [{ key: 'k', value: { intValue: 1 } }] },
        ],
      });
      const trace = parseOtlpTrace(makeTrace([span]));
      const link = trace.spans[0].links[0];
      expect(link.traceID).toBe('other');
      expect(link.spanID).toBe('other-span');
      expect(link.attributes[0].value).toBe(1);
    });
  });

  describe('trace-level properties', () => {
    it('computes startTime and endTime from span extremes', () => {
      const early = makeSpan({
        spanId: 'early',
        startTimeUnixNano: '1000000000',
        endTimeUnixNano: '1500000000',
      });
      const late = makeSpan({
        spanId: 'late',
        startTimeUnixNano: '1200000000',
        endTimeUnixNano: '2000000000',
      });
      const trace = parseOtlpTrace(makeTrace([early, late]));
      expect(trace.startTime).toBe(1_000_000);
      expect(trace.endTime).toBe(2_000_000);
      expect(trace.duration).toBe(1_000_000);
    });

    it('assigns relativeStartTime relative to trace start', () => {
      const early = makeSpan({
        spanId: 'early',
        startTimeUnixNano: '1000000000',
        endTimeUnixNano: '1500000000',
      });
      const late = makeSpan({
        spanId: 'late',
        startTimeUnixNano: '1200000000',
        endTimeUnixNano: '2000000000',
      });
      const trace = parseOtlpTrace(makeTrace([early, late]));
      expect(trace.spanMap.get('early')!.relativeStartTime).toBe(0);
      expect(trace.spanMap.get('late')!.relativeStartTime).toBe(200_000); // 0.2s = 200_000µs
    });

    it('counts spans per service', () => {
      const data: OtlpTracesData = {
        resourceSpans: [
          {
            resource: { attributes: [{ key: 'service.name', value: { stringValue: 'svc-a' } }] },
            scopeSpans: [{ spans: [makeSpan({ spanId: 'a1' }), makeSpan({ spanId: 'a2' })] }],
          },
          {
            resource: { attributes: [{ key: 'service.name', value: { stringValue: 'svc-b' } }] },
            scopeSpans: [{ spans: [makeSpan({ spanId: 'b1' })] }],
          },
        ],
      };
      const trace = parseOtlpTrace(data);
      const svcA = trace.services.find(s => s.name === 'svc-a');
      const svcB = trace.services.find(s => s.name === 'svc-b');
      expect(svcA?.numberOfSpans).toBe(2);
      expect(svcB?.numberOfSpans).toBe(1);
    });

    it('derives traceName from the earliest root span', () => {
      const early = makeSpan({
        spanId: 'early',
        name: 'root-op',
        startTimeUnixNano: '1000000000',
        endTimeUnixNano: '3000000000',
      });
      const late = makeSpan({
        spanId: 'late',
        name: 'other-root',
        startTimeUnixNano: '2000000000',
        endTimeUnixNano: '3000000000',
      });
      const trace = parseOtlpTrace(makeTrace([early, late], 'my-svc'));
      expect(trace.traceName).toBe('my-svc: root-op');
      expect(trace.tracePageTitle).toBe('my-svc: root-op');
    });

    it('uses traceId from first span', () => {
      const trace = parseOtlpTrace(makeTrace([makeSpan({ traceId: 'xyz' })]));
      expect(trace.traceID).toBe('xyz');
    });

    it('sorts spans by startTime', () => {
      const late = makeSpan({
        spanId: 'late',
        startTimeUnixNano: '2000000000',
        endTimeUnixNano: '3000000000',
      });
      const early = makeSpan({
        spanId: 'early',
        startTimeUnixNano: '1000000000',
        endTimeUnixNano: '1500000000',
      });
      const trace = parseOtlpTrace(makeTrace([late, early]));
      expect(trace.spans[0].spanID).toBe('early');
      expect(trace.spans[1].spanID).toBe('late');
    });

    it('populates spanMap for all spans', () => {
      const s1 = makeSpan({ spanId: 'a' });
      const s2 = makeSpan({ spanId: 'b' });
      const trace = parseOtlpTrace(makeTrace([s1, s2]));
      expect(trace.spanMap.has('a')).toBe(true);
      expect(trace.spanMap.has('b')).toBe(true);
    });
  });

  describe('hasErrors', () => {
    it('returns false when no spans have error status', () => {
      const trace = parseOtlpTrace(makeTrace([makeSpan({ status: { code: 0 } })]));
      expect(trace.hasErrors()).toBe(false);
    });

    it('returns true when any span has error status', () => {
      const ok = makeSpan({ spanId: 's1', status: { code: 0 } });
      const err = makeSpan({ spanId: 's2', status: { code: 2 } });
      const trace = parseOtlpTrace(makeTrace([ok, err]));
      expect(trace.hasErrors()).toBe(true);
    });
  });

  it('throws when there are no spans', () => {
    expect(() => parseOtlpTrace({ resourceSpans: [] })).toThrow('No spans found in trace data');
    expect(() => parseOtlpTrace({})).toThrow('No spans found in trace data');
  });

  it('handles spans without optional fields gracefully', () => {
    const data: OtlpTracesData = {
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 'tid',
                  spanId: 'sid',
                  name: 'op',
                  startTimeUnixNano: BASE_NANO,
                  endTimeUnixNano: BASE_NANO_END,
                },
              ],
            },
          ],
        },
      ],
    };
    const trace = parseOtlpTrace(data);
    expect(trace.spans[0].attributes).toEqual([]);
    expect(trace.spans[0].events).toEqual([]);
    expect(trace.spans[0].links).toEqual([]);
    expect(trace.spans[0].status.code).toBe(StatusCode.UNSET);
    expect(trace.spans[0].resource.serviceName).toBe('');
  });
});
