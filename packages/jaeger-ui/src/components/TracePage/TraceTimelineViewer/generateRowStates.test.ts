// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import generateRowStates from './generateRowStates';
import DetailState from './SpanDetail/DetailState';
import { IOtelSpan, StatusCode } from '../../../types/otel';

function makeSpan(overrides: Partial<IOtelSpan> & { spanID: string; depth: number }): IOtelSpan {
  return {
    hasChildren: false,
    childSpans: [],
    parentSpan: undefined,
    resource: { serviceName: 'default-svc', attributes: [] },
    status: { code: StatusCode.UNSET },
    ...overrides,
  } as unknown as IOtelSpan;
}

// A small trace:
//   span-0: svc-a (depth 0, root)
//     span-1: svc-b (depth 1)
//       span-2: svc-b (depth 2, ERROR)
//     span-3: svc-c (depth 1)
function makeTestSpans(): IOtelSpan[] {
  return [
    makeSpan({
      spanID: 'span-0',
      depth: 0,
      hasChildren: true,
      resource: { serviceName: 'svc-a', attributes: [] },
    }),
    makeSpan({
      spanID: 'span-1',
      depth: 1,
      hasChildren: true,
      resource: { serviceName: 'svc-b', attributes: [] },
    }),
    makeSpan({
      spanID: 'span-2',
      depth: 2,
      resource: { serviceName: 'svc-b', attributes: [] },
      status: { code: StatusCode.ERROR },
    }),
    makeSpan({ spanID: 'span-3', depth: 1, resource: { serviceName: 'svc-c', attributes: [] } }),
  ];
}

describe('generateRowStates', () => {
  it('returns empty array for null spans', () => {
    expect(generateRowStates(null, new Set(), new Map(), 'inline', new Set())).toEqual([]);
  });

  it('returns all spans when no collapse or pruning', () => {
    const spans = makeTestSpans();
    const rows = generateRowStates(spans, new Set(), new Map(), 'inline', new Set());
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-1', 'span-2', 'span-3']);
  });

  it('collapses children when span is in childrenHiddenIDs', () => {
    const spans = makeTestSpans();
    const rows = generateRowStates(spans, new Set(['span-1']), new Map(), 'inline', new Set());
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-1', 'span-3']);
  });

  it('adds detail rows for spans in detailStates (inline mode)', () => {
    const spans = makeTestSpans();
    const details = new Map([['span-1', new DetailState()]]);
    const rows = generateRowStates(spans, new Set(), details, 'inline', new Set());
    const detailRows = rows.filter(r => r.isDetail);
    expect(detailRows).toHaveLength(1);
    expect(detailRows[0].span.spanID).toBe('span-1');
  });

  it('skips detail rows in sidepanel mode', () => {
    const spans = makeTestSpans();
    const details = new Map([['span-1', new DetailState()]]);
    const rows = generateRowStates(spans, new Set(), details, 'sidepanel', new Set());
    expect(rows.filter(r => r.isDetail)).toHaveLength(0);
  });

  describe('service filter pruning', () => {
    it('prunes spans of a pruned service and their subtrees', () => {
      const spans = makeTestSpans();
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', new Set(['svc-b']));
      const spanIDs = rows.filter(r => !('isPrunedPlaceholder' in r)).map(r => r.span.spanID);
      expect(spanIDs).toEqual(['span-0', 'span-3']);
    });

    it('inserts a pruned placeholder with total subtree count', () => {
      const spans = makeTestSpans();
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', new Set(['svc-b']));
      const placeholders = rows.filter(r => 'isPrunedPlaceholder' in r);
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].prunedChildrenCount).toBe(2); // span-1 + span-2
      expect(placeholders[0].span.spanID).toBe('span-0'); // parent
    });

    it('counts errors in pruned subtrees', () => {
      const spans = makeTestSpans();
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', new Set(['svc-b']));
      const placeholder = rows.find(r => 'isPrunedPlaceholder' in r);
      expect(placeholder!.prunedErrorCount).toBe(1);
    });

    it('produces no placeholders when prunedServices is empty', () => {
      const spans = makeTestSpans();
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', new Set());
      expect(rows.filter(r => 'isPrunedPlaceholder' in r)).toHaveLength(0);
    });

    it('places placeholder after visible children of the parent', () => {
      const spans = makeTestSpans();
      // Prune svc-c (span-3); span-0's visible children are span-1 subtree, placeholder should be last
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', new Set(['svc-c']));
      const lastRow = rows[rows.length - 1];
      expect('isPrunedPlaceholder' in lastRow).toBe(true);
      expect(lastRow.span.spanID).toBe('span-0');
    });
  });
});
