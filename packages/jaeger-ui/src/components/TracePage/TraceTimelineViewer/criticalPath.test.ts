// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { makeCriticalPathContext } from './criticalPath';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';
import { CriticalPathSection } from '../../../types/critical_path';

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
