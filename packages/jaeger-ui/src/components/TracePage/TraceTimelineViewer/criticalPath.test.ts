// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { getCriticalPathSections } from './criticalPath';
import { CriticalPathSection } from '../../../types/critical_path';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';

function makeSpan(spanID: string, serviceName: string, childSpans: IOtelSpan[] = []): IOtelSpan {
  return {
    spanID,
    hasChildren: childSpans.length > 0,
    childSpans,
    parentSpan: undefined,
    resource: { serviceName, attributes: [] },
  } as unknown as IOtelSpan;
}

function makeTrace(spans: IOtelSpan[]): IOtelTrace {
  return {
    spans,
    spanMap: new Map(spans.map(s => [s.spanID, s])),
  } as unknown as IOtelTrace;
}

function makeSection(spanID: string, sectionStart: number, sectionEnd: number): CriticalPathSection {
  return { spanID, sectionStart, sectionEnd } as unknown as CriticalPathSection;
}

describe('getCriticalPathSections', () => {
  it('returns [] when criticalPath is falsy and span is collapsed', () => {
    const span = makeSpan('s1', 'svc-a');
    const trace = makeTrace([span]);
    const result = getCriticalPathSections(span, true, false, trace, undefined, new Set());
    expect(result).toEqual([]);
  });

  it('returns own sections for a non-collapsed span with no pruned children', () => {
    const span = makeSpan('s1', 'svc-a');
    const trace = makeTrace([span]);
    const criticalPath = [makeSection('s1', 0, 10)];
    const result = getCriticalPathSections(span, false, false, trace, criticalPath, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].spanID).toBe('s1');
  });

  it('merges only pruned subtree critical path when hasPrunedChildren is true', () => {
    const prunedChild = makeSpan('pruned-child', 'svc-pruned');
    const visibleChild = makeSpan('visible-child', 'svc-visible');
    const parentSpan = makeSpan('parent', 'svc-a', [prunedChild, visibleChild]);
    const trace = makeTrace([parentSpan, prunedChild, visibleChild]);
    const criticalPath = [
      makeSection('parent', 0, 10),
      makeSection('pruned-child', 10, 20),
      makeSection('visible-child', 20, 30),
    ];
    const result = getCriticalPathSections(
      parentSpan,
      false,
      true,
      trace,
      criticalPath,
      new Set(['svc-pruned'])
    );
    const spanIDs = result.map(s => s.spanID);
    expect(spanIDs).toContain('parent');
    expect(spanIDs).toContain('pruned-child');
    expect(spanIDs).not.toContain('visible-child');
  });
});
