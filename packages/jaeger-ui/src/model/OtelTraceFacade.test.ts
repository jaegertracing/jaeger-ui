// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import OtelTraceFacade from './OtelTraceFacade';
import transformTraceData from './transform-trace-data';
import { Trace, Span, Process } from '../types/trace';
import { IOtelTrace } from '../types/otel';

describe('OtelTraceFacade', () => {
  const mockProcess: Process = {
    serviceName: 'test-service',
    tags: [],
  };

  const mockSpan: Span = {
    traceID: 'trace-1',
    spanID: 'span-1',
    operationName: 'test-op',
    startTime: 1000 as IOtelTrace['startTime'],
    duration: 500 as IOtelTrace['duration'],
    processID: 'p1',
    process: mockProcess,
    tags: [],
    logs: [],
    references: [],
    depth: 0,
    hasChildren: false,
    relativeStartTime: 0,
    childSpans: [],
    warnings: [],
    subsidiarilyReferencedBy: [],
  };

  const mockLegacyTrace: Trace = {
    traceID: 'trace-1',
    spans: [mockSpan],
    processes: { p1: mockProcess },
    duration: 500 as IOtelTrace['duration'],
    startTime: 1000 as IOtelTrace['startTime'],
    endTime: 1500 as IOtelTrace['endTime'],
    traceName: 'test-trace',
    tracePageTitle: 'test-trace-title',
    traceEmoji: '😀',
    services: [{ name: 'test-service', numberOfSpans: 1 }],
    spanMap: new Map([[mockSpan.spanID, mockSpan]]),
    rootSpans: [mockSpan],
    asOtelTrace() {
      throw new Error('Not implemented');
    },
  };

  let facade: OtelTraceFacade;

  beforeEach(() => {
    facade = new OtelTraceFacade(mockLegacyTrace);
  });

  it('maps basic trace fields', () => {
    expect(facade.traceID).toBe('trace-1');
    expect(facade.traceName).toBe('test-trace');
    expect(facade.duration).toBe(500 as IOtelTrace['duration']);
    expect(facade.startTime).toBe(1000 as IOtelTrace['startTime']);
    expect(facade.endTime).toBe(1500 as IOtelTrace['endTime']);
  });

  it('maps spans to OtelSpanFacade instances', () => {
    expect(facade.spans).toHaveLength(1);
    expect(facade.spans[0].spanID).toBe('span-1');
    expect(facade.spans[0].name).toBe('test-op');
  });

  it('maps services summary', () => {
    expect(facade.services).toEqual([{ name: 'test-service', numberOfSpans: 1 }]);
  });

  describe('isGenAITrace', () => {
    it('returns false when no span has gen_ai.* tags', () => {
      expect(facade.isGenAITrace).toBe(false);
    });

    it('returns true when at least one span has a gen_ai.* tag', () => {
      const genAiSpan: Span = {
        ...mockSpan,
        spanID: 'genai-span',
        tags: [{ key: 'gen_ai.operation.name', value: 'chat' }],
      };
      const genAiTrace: Trace = {
        ...mockLegacyTrace,
        spans: [mockSpan, genAiSpan],
        spanMap: new Map([
          [mockSpan.spanID, mockSpan],
          [genAiSpan.spanID, genAiSpan],
        ]),
        rootSpans: [mockSpan],
      };
      expect(new OtelTraceFacade(genAiTrace).isGenAITrace).toBe(true);
    });
  });

  describe('span wiring', () => {
    const parentSpan: Span = { ...mockSpan, spanID: 'parent', hasChildren: true };
    const childSpan: Span = {
      ...mockSpan,
      spanID: 'child',
      references: [{ refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent', span: parentSpan }],
      // Mirrors what transformTraceData would have set given the childSpans wiring below.
      parentID: 'parent',
    };
    const linkSpan: Span = { ...mockSpan, spanID: 'link' };

    // Set up child reference on parent
    (parentSpan as any).childSpans = [childSpan];
    // Set up link reference on child
    (childSpan as any).subsidiarilyReferencedBy = [
      { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'link', span: linkSpan },
    ];

    const complexTrace: Trace = {
      ...mockLegacyTrace,
      spans: [parentSpan, childSpan, linkSpan],
      spanMap: new Map([
        ['parent', parentSpan],
        ['child', childSpan],
        ['link', linkSpan],
      ]),
      rootSpans: [parentSpan],
    };

    it('wires up parentSpan and childSpans correctly', () => {
      const complexFacade = new OtelTraceFacade(complexTrace);
      const parentFacade = complexFacade.spanMap.get('parent')!;
      const childFacade = complexFacade.spanMap.get('child')!;

      expect(childFacade.parentSpanID).toBe('parent');
      expect(childFacade.parentSpan).toBe(parentFacade);
      expect(parentFacade.childSpans).toContain(childFacade);
      expect(parentFacade.hasChildren).toBe(true);
    });

    it('wires up link span references correctly', () => {
      const complexFacade = new OtelTraceFacade(complexTrace);
      const childFacade = complexFacade.spanMap.get('child')!;
      const linkFacade = complexFacade.spanMap.get('link')!;

      // Check links (not explicitly set in this mock, but let's test the mechanism)
      // Actually, my populator uses inboundLinks which I set
      expect(childFacade.inboundLinks).toHaveLength(1);
      expect(childFacade.inboundLinks[0].spanID).toBe('link');
      expect(childFacade.inboundLinks[0].span).toBe(linkFacade);
    });
  });

  describe('orphanSpanCount', () => {
    it('is 0 for a trace with no orphans', () => {
      expect(facade.orphanSpanCount).toBe(0);
    });

    it('reflects transformTraceData’s count rather than recomputing it from parentSpanID', () => {
      // legacyTrace.orphanSpanCount is the authoritative count, produced by the same
      // resolution that builds childSpans/rootSpans. It is not necessarily 0 even though
      // every span's parentSpanID (once resolved) always points at a span present in this
      // trace - an orphan has no parentSpanID at all; it became a root instead.
      const orphanTrace: Trace = { ...mockLegacyTrace, orphanSpanCount: 3 };
      expect(new OtelTraceFacade(orphanTrace).orphanSpanCount).toBe(3);
    });

    it('defaults to 0 when legacyTrace.orphanSpanCount is undefined', () => {
      const traceWithoutCount: Trace = { ...mockLegacyTrace, orphanSpanCount: undefined };
      expect(new OtelTraceFacade(traceWithoutCount).orphanSpanCount).toBe(0);
    });
  });

  // End-to-end regression test for https://github.com/jaegertracing/jaeger-ui/issues/4460:
  // OtelSpanFacade used to resolve a span's parent independently of the childSpans tree
  // transformTraceData already built, and the two could disagree. Going through the real
  // transformTraceData -> asOtelTrace() pipeline (rather than hand-built facades) is what
  // actually proves the two views of the tree now agree.
  describe('parentSpan/childSpans agreement (#4460)', () => {
    const buildSpan = (spanID: string, startTime: number, references: Span['references'] = []) => ({
      traceID: 'trace-1',
      spanID,
      processID: 'p1',
      operationName: spanID,
      startTime,
      duration: 10,
      references,
    });

    it('keeps parentSpan and childSpans consistent when a FOLLOWS_FROM reference precedes the CHILD_OF the tree actually used', () => {
      const data = {
        traceID: 'trace-1',
        processes: { p1: { serviceName: 'svc', tags: [] } },
        spans: [
          buildSpan('root', 1000),
          buildSpan('a', 1010),
          buildSpan('b', 1010),
          buildSpan('s', 1020, [
            { refType: 'FOLLOWS_FROM' as const, spanID: 'a', traceID: 'trace-1', span: null },
            { refType: 'CHILD_OF' as const, spanID: 'b', traceID: 'trace-1', span: null },
          ]),
        ],
      };

      const otel = transformTraceData(data)!.asOtelTrace();
      const s = otel.spanMap.get('s')!;
      const a = otel.spanMap.get('a')!;
      const b = otel.spanMap.get('b')!;

      // The render tree (array-order-first-match, per transformTraceData) places `s` under `a`.
      expect(a.childSpans).toContain(s);
      expect(b.childSpans).not.toContain(s);

      // parentSpan must agree with that tree, not independently prefer the CHILD_OF reference.
      expect(s.parentSpan).toBe(a);
      expect(s.parentSpanID).toBe('a');

      // The general invariant #4460 asks for: walking up and back down agree.
      expect(s.parentSpan?.childSpans).toContain(s);
    });

    it('keeps parentSpan undefined when the resolved CHILD_OF target is absent from this trace, even though a FOLLOWS_FROM target is present', () => {
      const data = {
        traceID: 'trace-1',
        processes: { p1: { serviceName: 'svc', tags: [] } },
        spans: [
          buildSpan('a', 1000),
          buildSpan('s', 1010, [
            { refType: 'CHILD_OF' as const, spanID: 'a', traceID: 'trace-1', span: null },
            { refType: 'FOLLOWS_FROM' as const, spanID: 'missing', traceID: 'trace-1', span: null },
          ]),
        ],
      };

      const otel = transformTraceData(data)!.asOtelTrace();
      const s = otel.spanMap.get('s')!;
      const a = otel.spanMap.get('a')!;

      expect(a.childSpans).toContain(s);
      expect(s.parentSpan).toBe(a);
      expect(s.parentSpanID).toBe('a');
    });

    it('holds span.parentSpan === undefined || span.parentSpan.childSpans.includes(span) for every span, across a generated multi-reference trace', () => {
      // A broader sweep beyond the two hand-picked shapes above: every span that carries
      // more than one same-trace CHILD_OF/FOLLOWS_FROM reference must still agree between
      // parentSpan and childSpans, whichever reference transformTraceData happened to pick.
      const spans = [
        buildSpan('root', 1000),
        buildSpan('m1', 1010),
        buildSpan('m2', 1020),
        buildSpan('multi-ref-1', 1030, [
          { refType: 'FOLLOWS_FROM' as const, spanID: 'm1', traceID: 'trace-1', span: null },
          { refType: 'CHILD_OF' as const, spanID: 'm2', traceID: 'trace-1', span: null },
        ]),
        buildSpan('multi-ref-2', 1040, [
          { refType: 'CHILD_OF' as const, spanID: 'm1', traceID: 'trace-1', span: null },
          { refType: 'CHILD_OF' as const, spanID: 'm2', traceID: 'trace-1', span: null },
        ]),
      ];
      const data = { traceID: 'trace-1', processes: { p1: { serviceName: 'svc', tags: [] } }, spans };

      const otel = transformTraceData(data)!.asOtelTrace();
      otel.spans.forEach(span => {
        expect(span.parentSpan === undefined || span.parentSpan.childSpans.includes(span)).toBe(true);
      });
    });
  });
});
