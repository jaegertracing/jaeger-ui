// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from './transform-trace-data';
import { SpanData, SpanReference, TraceData } from '../types/trace';
import { toLegacyTrace } from './test/materializer-legacy';
import { runTraceContractSuite } from './test/trace-contract-suite';
import { getParent } from './span';

describe('transformTraceData()', () => {
  const startTime = 1586160015434000;
  const duration = 34000;
  const traceID = 'f77950feed55c1ce91dd8e87896623a6';
  const rootSpanID = 'd4dcb46e95b781f5';
  const rootOperationName = 'rootOperation';
  const serviceName = 'serviceName';
  const trace = (...spans: SpanData[]) => ({
    traceID,
    processes: { p1: { serviceName, tags: [] } },
    spans,
  });
  const spans: SpanData[] = [
    {
      traceID,
      spanID: '41f71485ed2593e4',
      operationName: 'someOperationName',
      references: [{ refType: 'CHILD_OF', spanID: rootSpanID, traceID, span: undefined }],
      startTime,
      duration,
      tags: [],
      logs: [],
      processID: 'p1',
    },
    {
      traceID,
      spanID: '4f623fd33c213cba',
      operationName: 'anotherOperationName',
      references: [{ refType: 'CHILD_OF', spanID: rootSpanID, traceID, span: undefined }],
      startTime: startTime + 100,
      duration,
      tags: [],
      logs: [],
      processID: 'p1',
    },
  ];
  const rootSpanWithoutRefs: SpanData = {
    traceID,
    spanID: rootSpanID,
    operationName: rootOperationName,
    references: [],
    startTime: startTime + 50,
    duration,
    tags: [],
    logs: [],
    processID: 'p1',
  };

  it('should return null for trace without traceID', () => {
    const traceData = { ...trace(...spans), traceID: undefined };

    // @ts-expect-error The input deliberately omits the required trace ID.
    expect(transformTraceData(traceData)).toEqual(null);
  });

  describe('legacy reference selection', () => {
    const reference = (
      refType: SpanReference['refType'],
      spanID: string,
      refTraceID = traceID
    ): SpanReference => ({ refType, spanID, traceID: refTraceID, span: undefined });

    it.each([
      {
        name: 'prefers CHILD_OF even after FOLLOWS_FROM',
        references: [reference('FOLLOWS_FROM', 'a'), reference('CHILD_OF', 'b')],
        parent: 'b',
        links: ['a'],
      },
      {
        name: 'selects the first same-trace CHILD_OF',
        references: [reference('CHILD_OF', 'a'), reference('CHILD_OF', 'b')],
        parent: 'a',
        links: ['b'],
      },
      {
        name: 'consumes the first same-trace FOLLOWS_FROM as the parent',
        references: [reference('FOLLOWS_FROM', 'a'), reference('FOLLOWS_FROM', 'b')],
        parent: 'a',
        links: ['b'],
      },
      {
        name: 'ignores cross-trace CHILD_OF when choosing a parent',
        references: [reference('CHILD_OF', 'a', 'other-trace'), reference('FOLLOWS_FROM', 'b')],
        parent: 'b',
        links: ['a'],
      },
      {
        name: 'consumes the selected CHILD_OF reference without creating a link',
        references: [reference('CHILD_OF', 'a')],
        parent: 'a',
        links: [],
      },
      {
        name: 'consumes the selected FOLLOWS_FROM reference without creating a link',
        references: [reference('FOLLOWS_FROM', 'a')],
        parent: 'a',
        links: [],
      },
      {
        name: 'preserves a cross-trace link with the selected parent span ID',
        references: [reference('CHILD_OF', 'a', 'other-trace'), reference('CHILD_OF', 'a')],
        parent: 'a',
        links: ['a'],
      },
      {
        name: 'keeps cross-trace references as links without choosing a parent',
        references: [
          reference('CHILD_OF', 'a', 'other-trace'),
          reference('FOLLOWS_FROM', 'b', 'other-trace'),
        ],
        parent: undefined,
        links: ['a', 'b'],
      },
      {
        name: 'does not replace a missing preferred parent with a resolvable reference',
        references: [reference('CHILD_OF', 'missing'), reference('CHILD_OF', 'a')],
        parent: 'missing',
        links: ['a'],
      },
      {
        name: 'does not use an existing FOLLOWS_FROM instead of a missing CHILD_OF',
        references: [reference('FOLLOWS_FROM', 'a'), reference('CHILD_OF', 'missing')],
        parent: 'missing',
        links: ['a'],
      },
    ])('$name', ({ references, parent, links }) => {
      const makeSpan = (spanID: string): SpanData => ({
        traceID,
        spanID,
        operationName: spanID,
        processID: 'p1',
        startTime: 1,
        duration: 1,
      });
      const result = transformTraceData(
        trace(makeSpan('a'), makeSpan('b'), {
          ...makeSpan('subject'),
          references: references.map(ref => ({ ...ref })),
        })
      )!;
      const otel = result.asOtelTrace();
      const subject = otel.spanMap.get('subject')!;
      const expectedParent = parent ? otel.spanMap.get(parent) : undefined;
      expect(subject.parentSpanID).toBe(parent);
      expect(subject.parentSpan).toBe(expectedParent);
      expect(subject.depth).toBe(expectedParent ? 1 : 0);
      expect(otel.rootSpans.includes(subject)).toBe(!expectedParent);
      expect(subject.links.map(link => link.spanID)).toEqual(links);
      expect(result.orphanSpanCount).toBe(parent === 'missing' ? 1 : 0);
      expect(otel.orphanSpanCount).toBe(result.orphanSpanCount);
      for (const spanID of ['a', 'b']) {
        const target = otel.spanMap.get(spanID)!;
        expect(target.childSpans.includes(subject)).toBe(spanID === parent);
        const incoming = subject.links.filter(link => link.traceID === traceID && link.spanID === spanID);
        expect(target.inboundLinks.map(link => link.spanID)).toEqual(incoming.map(() => 'subject'));
      }
      for (const link of subject.links) {
        expect(link.span).toBe(link.traceID === traceID ? otel.spanMap.get(link.spanID) : undefined);
      }
    });
  });

  describe('parent-cycle repair', () => {
    it('clears stale cycle state before rebuilding parent edges', () => {
      const data = toLegacyTrace({
        traceID: 'rebuilt-cycle',
        serviceName,
        spans: [
          { spanID: 'root', operationName: 'root' },
          { spanID: 'a', operationName: 'a', parentSpanID: 'b' },
          { spanID: 'b', operationName: 'b', parentSpanID: 'a' },
        ],
      });
      const first = transformTraceData(data)!;
      expect(first.spanMap.get('a')!.parentCycleBroken).toBe(true);
      expect(first.spanMap.get('root')).not.toHaveProperty('parentCycleBroken');
      expect(first.spanMap.get('b')).not.toHaveProperty('parentCycleBroken');

      const repeated = transformTraceData(data)!;
      expect(repeated.spans).toHaveLength(3);
      expect(repeated.rootSpans.map(span => span.spanID)).toEqual(['root', 'a']);
      expect(repeated.spanMap.get('a')!.childSpans.map(span => span.spanID)).toEqual(['b']);

      data.spans[1].references = [
        { refType: 'CHILD_OF', spanID: 'root', traceID: data.traceID, span: undefined },
      ];
      const rebuilt = transformTraceData(data)!.asOtelTrace();
      expect(rebuilt.rootSpans.map(span => span.spanID)).toEqual(['root']);
      expect(rebuilt.spanMap.get('a')!.parentSpan).toBe(rebuilt.spanMap.get('root'));
      expect(rebuilt.spanMap.get('b')!.parentSpan).toBe(rebuilt.spanMap.get('a'));
      for (const span of data.spans) expect(span).not.toHaveProperty('parentCycleBroken');
    });

    const cases: {
      name: string;
      spans: { id: string; parent?: string; start?: number; extraParent?: string }[];
      roots: number;
    }[] = [
      { name: 'self-cycle', spans: [{ id: 'a', parent: 'a' }], roots: 1 },
      {
        name: 'two-span cycle',
        spans: [
          { id: 'a', parent: 'b' },
          { id: 'b', parent: 'a' },
        ],
        roots: 1,
      },
      {
        name: 'three-span cycle',
        spans: [
          { id: 'a', parent: 'b' },
          { id: 'b', parent: 'c' },
          { id: 'c', parent: 'a' },
        ],
        roots: 1,
      },
      {
        name: 'disjoint cycles',
        spans: [
          { id: 'a', parent: 'b' },
          { id: 'b', parent: 'a' },
          { id: 'c', parent: 'c' },
        ],
        roots: 2,
      },
      {
        name: 'healthy subtree beside a cycle',
        spans: [
          { id: 'root' },
          { id: 'child', parent: 'root' },
          { id: 'a', parent: 'b' },
          { id: 'b', parent: 'a' },
        ],
        roots: 2,
      },
      {
        name: 'missing-start cycle root with a descendant',
        spans: [
          { id: 'a', parent: 'b', start: 0 },
          { id: 'b', parent: 'a' },
          { id: 'leaf', parent: 'b', start: 0 },
        ],
        roots: 1,
      },
      {
        name: 'cycle root with an additional parent-like link',
        spans: [
          { id: 'a', parent: 'b', extraParent: 'b' },
          { id: 'b', parent: 'a' },
        ],
        roots: 1,
      },
    ];

    it.each(cases)(
      'retains every span with acyclic parent and child edges for $name',
      ({ name, spans: specs, roots }) => {
        const cycleTraceID = `cycle-${name}`;
        const result = transformTraceData(
          toLegacyTrace({
            traceID: cycleTraceID,
            serviceName,
            spans: specs.map(spec => ({
              spanID: spec.id,
              operationName: spec.id,
              parentSpanID: spec.parent,
              startTime: spec.start ?? startTime,
              duration,
              references: spec.extraParent ? [{ refType: 'FOLLOWS_FROM', spanID: spec.extraParent }] : [],
            })),
          })
        )!;
        const otel = result.asOtelTrace();
        expect(otel.spans.map(span => span.spanID).sort()).toEqual(specs.map(spec => spec.id).sort());
        expect(otel.rootSpans).toHaveLength(roots);
        expect(result.orphanSpanCount).toBe(0);
        expect(otel.orphanSpanCount).toBe(0);
        const visited = new Set();
        const stack = [...otel.rootSpans];
        while (stack.length) {
          const span = stack.pop()!;
          expect(visited.has(span)).toBe(false);
          visited.add(span);
          for (const child of span.childSpans) {
            expect(child.parentSpan).toBe(span);
            expect(child.parentSpanID).toBe(span.spanID);
            expect(child.depth).toBe(span.depth + 1);
            stack.push(child);
          }
        }
        expect(visited.size).toBe(specs.length);
        for (const root of otel.rootSpans) {
          expect(root.parentSpan).toBeUndefined();
          expect(root.parentSpanID).toBeUndefined();
          if (root.warnings?.length) {
            expect(root.warnings).toHaveLength(1);
            const source = result.spanMap.get(root.spanID)!;
            expect(getParent(source)).toBeNull();
            expect(source.references.length).toBeGreaterThan(0);
            expect(root.links).toHaveLength(source.references.length - 1);
            for (const link of root.links) expect(link.span).toBe(otel.spanMap.get(link.spanID));
          }
        }
        expect(otel.rootSpans.filter(root => root.warnings?.length)).toHaveLength(
          name === 'disjoint cycles' ? 2 : 1
        );
        if (name === 'missing-start cycle root with a descendant') {
          expect(otel.spanMap.get('a')!.startTime).toBe(0);
          expect(otel.spanMap.get('leaf')!.startTime).toBe(startTime);
        }
      }
    );
  });

  describe('asOtelTrace()', () => {
    it('should implement IOtelTrace interface and memoize the instance', () => {
      const traceData = trace(...spans, rootSpanWithoutRefs);

      const result = transformTraceData(traceData)!;

      // Check if asOtelTrace exists
      expect(typeof result.asOtelTrace).toBe('function');

      // First call - should create instance
      const otelTrace1 = result.asOtelTrace();
      expect(otelTrace1).toBeDefined();
      expect(otelTrace1.traceID).toBe(traceID);
      expect(otelTrace1.spans.length).toBe(3);

      // Second call - should return same instance (memoization)
      const otelTrace2 = result.asOtelTrace();
      expect(otelTrace2).toBe(otelTrace1);
    });
  });
});

runTraceContractSuite({
  name: 'legacy transformer',
  materialize: toLegacyTrace,
  spanID: (label: string) => label,
  parse: (traceData: TraceData & { spans: SpanData[] }) => transformTraceData(traceData)!.asOtelTrace(),
});
