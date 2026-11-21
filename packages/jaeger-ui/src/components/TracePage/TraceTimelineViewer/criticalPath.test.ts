// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { makeCriticalPathContext } from './criticalPath';
import { makeAttributes } from '../../../model/attributes';
import { IOtelSpan, IOtelTrace, SpanKind, StatusCode } from '../../../types/otel';
import { CriticalPathSection } from '../../../types/critical_path';
import type { Microseconds } from '../../../types/units';

// root > mid > leaf, where mid is the span the filter hides.
function makeTrace(): { trace: IOtelTrace; root: IOtelSpan; mid: IOtelSpan; leaf: IOtelSpan } {
  const root = {
    spanID: 'root',
    depth: 0,
    hasChildren: true,
    childSpans: [] as IOtelSpan[],
  } as unknown as IOtelSpan;
  const mid = {
    spanID: 'mid',
    depth: 1,
    hasChildren: true,
    childSpans: [] as IOtelSpan[],
    parentSpan: root,
  } as unknown as IOtelSpan;
  const leaf = {
    spanID: 'leaf',
    depth: 2,
    hasChildren: false,
    childSpans: [] as IOtelSpan[],
    parentSpan: mid,
  } as unknown as IOtelSpan;
  (root as unknown as { childSpans: IOtelSpan[] }).childSpans = [mid];
  (mid as unknown as { childSpans: IOtelSpan[] }).childSpans = [leaf];
  const spans = [root, mid, leaf];
  const trace = { spans, spanMap: new Map(spans.map(s => [s.spanID, s])) } as unknown as IOtelTrace;
  return { trace, root, mid, leaf };
}

const section = (spanID: string, sectionStart: number, sectionEnd: number) =>
  ({ spanID, sectionStart, sectionEnd }) as unknown as CriticalPathSection;

describe('makeCriticalPathContext', () => {
  const { trace, root, mid, leaf } = makeTrace();
  const criticalPath = [section('root', 0, 10), section('mid', 10, 20), section('leaf', 20, 30)];
  const hidden = new Set(['mid']);

  it('bubbles the whole hidden subtree onto the parent in remove mode', () => {
    const ctx = makeCriticalPathContext(trace, criticalPath, hidden, 'remove');
    expect(ctx.sectionsFor(root, false, true).map(s => s.spanID)).toEqual(['root', 'mid', 'leaf']);
  });

  it('bubbles only the hidden spans onto the nearest visible ancestor in lift mode', () => {
    const ctx = makeCriticalPathContext(trace, criticalPath, hidden, 'lift');
    expect(ctx.sectionsFor(root, false, true).map(s => s.spanID)).toEqual(['root', 'mid']);
    expect(ctx.sectionsFor(leaf, false, false).map(s => s.spanID)).toEqual(['leaf']);
  });

  it('leaves a span without hidden children with its own sections', () => {
    const ctx = makeCriticalPathContext(trace, criticalPath, hidden, 'lift');
    expect(ctx.sectionsFor(mid, false, false).map(s => s.spanID)).toEqual(['mid']);
  });

  it('bubbles a hidden chain onto its nearest visible ancestor in lift mode', () => {
    const ctx = makeCriticalPathContext(trace, criticalPath, new Set(['mid', 'leaf']), 'lift');
    expect(ctx.sectionsFor(root, false, true).map(s => s.spanID)).toEqual(['root', 'mid', 'leaf']);
  });

  it('drops the sections of a hidden root, which has no visible ancestor to carry them', () => {
    const ctx = makeCriticalPathContext(trace, criticalPath, new Set(['root']), 'lift');
    expect(ctx.sectionsFor(mid, false, false).map(s => s.spanID)).toEqual(['mid']);
    expect(ctx.sectionsFor(leaf, false, false).map(s => s.spanID)).toEqual(['leaf']);
  });

  it('merges the whole subtree onto a collapsed row in lift mode', () => {
    const ctx = makeCriticalPathContext(trace, criticalPath, hidden, 'lift');
    expect(
      ctx
        .sectionsFor(root, true, true)
        .map(s => s.spanID)
        .sort()
    ).toEqual(['leaf', 'mid', 'root']);
  });
});

const us = (n: number) => n as Microseconds;

function makeMockSpan(spanID: string, serviceName = 'service-a', childSpans: IOtelSpan[] = []): IOtelSpan {
  return {
    spanID,
    traceID: 'trace-1',
    name: `operation-${spanID}`,
    kind: SpanKind.INTERNAL,
    startTime: us(1000),
    endTime: us(2000),
    duration: us(1000),
    attributes: makeAttributes(),
    events: [],
    links: [],
    status: { code: StatusCode.OK },
    resource: { serviceName, attributes: makeAttributes() },
    instrumentationScope: { name: 'test' },
    depth: 0,
    hasChildren: childSpans.length > 0,
    childSpans,
    relativeStartTime: us(0),
    inboundLinks: [],
    warnings: null,
  };
}

function makeMockTrace(spans: IOtelSpan[]): IOtelTrace {
  const spanMap = new Map<string, IOtelSpan>();
  spans.forEach(s => spanMap.set(s.spanID, s));
  return {
    traceID: 'trace-1',
    spans,
    duration: us(5000),
    startTime: us(1000),
    endTime: us(6000),
    traceName: 'test-trace',
    tracePageTitle: 'test-title',
    traceEmoji: '',
    services: [],
    spanMap,
    rootSpans: spans.length > 0 ? [spans[0]] : [],
    orphanSpanCount: 0,
    isGenAITrace: false,
    hasErrors: () => false,
  };
}

describe('criticalPath', () => {
  describe('makeCriticalPathContext', () => {
    it('returns empty sections when criticalPath is empty or null', () => {
      const span = makeMockSpan('s1');
      const trace = makeMockTrace([span]);

      const ctxNull = makeCriticalPathContext(trace, null as any, new Set());
      expect(ctxNull.sectionsFor(span, false, false)).toEqual([]);

      const ctxEmpty = makeCriticalPathContext(trace, [], new Set());
      expect(ctxEmpty.sectionsFor(span, false, false)).toEqual([]);
    });

    it('returns own sections for an uncollapsed span with no pruned children', () => {
      const span = makeMockSpan('s1');
      const trace = makeMockTrace([span]);
      const criticalPath: CriticalPathSection[] = [
        { spanID: 's1', sectionStart: us(1000), sectionEnd: us(1500) },
      ];

      const ctx = makeCriticalPathContext(trace, criticalPath, new Set());
      const sections = ctx.sectionsFor(span, false, false);

      expect(sections).toEqual([{ spanID: 's1', sectionStart: us(1000), sectionEnd: us(1500) }]);
    });

    it('merges consecutive sections for a collapsed span and its descendants', () => {
      const child = makeMockSpan('c1');
      const root = makeMockSpan('r1', 'service-a', [child]);
      const trace = makeMockTrace([root, child]);

      // Critical path sections ordered from later to earlier in time
      const criticalPath: CriticalPathSection[] = [
        { spanID: 'c1', sectionStart: us(1500), sectionEnd: us(2000) },
        { spanID: 'r1', sectionStart: us(1000), sectionEnd: us(1500) },
      ];

      const ctx = makeCriticalPathContext(trace, criticalPath, new Set());
      const merged = ctx.sectionsFor(root, true, false);

      // Consecutive adjacent sections (1500-2000 and 1000-1500) should be merged into one (1000-2000)
      expect(merged).toHaveLength(1);
      expect(merged[0].sectionStart).toBe(1000);
      expect(merged[0].sectionEnd).toBe(2000);
    });

    it('memoizes collapsed section calculations on repeated calls', () => {
      const child = makeMockSpan('c1');
      const root = makeMockSpan('r1', 'service-a', [child]);
      const trace = makeMockTrace([root, child]);

      const criticalPath: CriticalPathSection[] = [
        { spanID: 'c1', sectionStart: us(1600), sectionEnd: us(2000) },
        { spanID: 'r1', sectionStart: us(1000), sectionEnd: us(1500) },
      ];

      const ctx = makeCriticalPathContext(trace, criticalPath, new Set());
      const firstCall = ctx.sectionsFor(root, true, false);
      const secondCall = ctx.sectionsFor(root, true, false);

      // Verify reference equality (cache hit)
      expect(firstCall).toBe(secondCall);
    });

    it('combines own sections with pruned child sections when hasPrunedChildren is true', () => {
      const childPruned = makeMockSpan('c-pruned', 'pruned-service');
      const root = makeMockSpan('r1', 'service-a', [childPruned]);
      const trace = makeMockTrace([root, childPruned]);

      const criticalPath: CriticalPathSection[] = [
        { spanID: 'r1', sectionStart: us(1000), sectionEnd: us(1200) },
        { spanID: 'c-pruned', sectionStart: us(1200), sectionEnd: us(1800) },
      ];

      const hiddenIDs = new Set(['c-pruned']);
      const ctx = makeCriticalPathContext(trace, criticalPath, hiddenIDs);

      const sections = ctx.sectionsFor(root, false, true);

      expect(sections).toHaveLength(2);
      expect(sections[0].spanID).toBe('r1');
      expect(sections[1].spanID).toBe('c-pruned');

      // Verify reference memoization for pruned combined sections
      const secondCall = ctx.sectionsFor(root, false, true);
      expect(sections).toBe(secondCall);
    });
  });
});
