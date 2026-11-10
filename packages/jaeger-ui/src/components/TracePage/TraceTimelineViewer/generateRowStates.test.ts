// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import generateRowStates from './generateRowStates';
import genaiTestTrace from './genaiTestTrace.json';
import DetailState from './SpanDetail/DetailState';
import { IOtelSpan, StatusCode } from '../../../types/otel';
import { makeAttributes } from '../../../model/attributes';
import transformTraceData from '../../../model/transform-trace-data';
import { EMPTY_SPAN_FILTER, evaluateSpanFilter, withHiddenServices } from '../spanFilter';

function makeSpan(overrides: Partial<IOtelSpan> & { spanID: string; depth: number }): IOtelSpan {
  return {
    hasChildren: false,
    childSpans: [],
    parentSpan: undefined,
    resource: { serviceName: 'default-svc', attributes: makeAttributes() },
    status: { code: StatusCode.UNSET },
    ...overrides,
  } as unknown as IOtelSpan;
}

// A small trace:
//   span-0: svc-a (depth 0, root)
//     span-1: svc-b (depth 1)
//       span-2: svc-b (depth 2, ERROR)
//     span-3: svc-c (depth 1)
// The hidden span set that pruning the given services produces over the spans.
const hiddenFor = (spans: ReadonlyArray<IOtelSpan>, ...services: string[]) =>
  evaluateSpanFilter(spans, withHiddenServices(EMPTY_SPAN_FILTER, new Set(services))).hiddenIDs;

function makeTestSpans(): IOtelSpan[] {
  return [
    makeSpan({
      spanID: 'span-0',
      depth: 0,
      hasChildren: true,
      resource: { serviceName: 'svc-a', attributes: makeAttributes() },
    }),
    makeSpan({
      spanID: 'span-1',
      depth: 1,
      hasChildren: true,
      resource: { serviceName: 'svc-b', attributes: makeAttributes() },
    }),
    makeSpan({
      spanID: 'span-2',
      depth: 2,
      resource: { serviceName: 'svc-b', attributes: makeAttributes() },
      status: { code: StatusCode.ERROR },
    }),
    makeSpan({
      spanID: 'span-3',
      depth: 1,
      resource: { serviceName: 'svc-c', attributes: makeAttributes() },
    }),
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
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-b'));
      const spanIDs = rows.filter(r => !('isPrunedPlaceholder' in r)).map(r => r.span.spanID);
      expect(spanIDs).toEqual(['span-0', 'span-3']);
    });

    it('renders no rows and no placeholder when the root itself is hidden', () => {
      const spans = makeTestSpans();
      const rows = generateRowStates(
        spans,
        new Set(),
        new Map(),
        'inline',
        new Set(spans.map(s => s.spanID))
      );
      expect(rows).toEqual([]);
    });

    it('inserts a pruned placeholder with total subtree count', () => {
      const spans = makeTestSpans();
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-b'));
      const placeholders = rows.filter(r => 'isPrunedPlaceholder' in r);
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].prunedChildrenCount).toBe(2); // span-1 + span-2
      expect(placeholders[0].span.spanID).toBe('span-0'); // parent
    });

    it('counts errors in pruned subtrees', () => {
      const spans = makeTestSpans();
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-b'));
      const placeholder = rows.find(r => 'isPrunedPlaceholder' in r);
      expect(placeholder!.prunedErrorCount).toBe(1);
    });

    it('produces no placeholders when nothing is hidden', () => {
      const spans = makeTestSpans();
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', new Set());
      expect(rows.filter(r => 'isPrunedPlaceholder' in r)).toHaveLength(0);
    });

    it('places placeholder after visible children of the parent', () => {
      const spans = makeTestSpans();
      // Prune svc-c (span-3); span-0's visible children are span-1 subtree, placeholder should be last
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-c'));
      const lastRow = rows[rows.length - 1];
      expect('isPrunedPlaceholder' in lastRow).toBe(true);
      expect(lastRow.span.spanID).toBe('span-0');
    });

    it('assigns non-decreasing spanIndex to placeholder rows', () => {
      const spans = makeTestSpans();
      // Prune svc-c (span-3, index 3 in the spans array)
      const rows = generateRowStates(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-c'));
      // Collect spanIndex values from non-detail rows (span bars + placeholders).
      const spanIndices = rows.filter(r => !r.isDetail).map(r => r.spanIndex);
      // Verify monotonically non-decreasing.
      const isSorted = spanIndices.every((val, i) => i === 0 || val >= spanIndices[i - 1]);
      expect(isSorted).toBe(true);
      // The placeholder's spanIndex should be >= the last visible child's spanIndex.
      const placeholder = rows.find(r => 'isPrunedPlaceholder' in r)!;
      const visibleSpanRows = rows.filter(r => !r.isDetail && !('isPrunedPlaceholder' in r));
      const lastVisible = visibleSpanRows[visibleSpanRows.length - 1];
      expect(placeholder.spanIndex).toBeGreaterThanOrEqual(lastVisible.spanIndex);
    });
  });
});

// genaiTestTrace.json is generated by scripts/utils/make-genai-trace.js. Its shape is an
// agent reached through two plain tiers (api-edge, graphql-gateway), whose tool calls fan
// out through a plain mcp-gateway, with a nested agent below one of those calls.
describe('service filter pruning on the GenAI sample trace', () => {
  const trace = transformTraceData(genaiTestTrace as never)!.asOtelTrace();
  const PLAIN_LEAF_SERVICES = new Set([
    'auth-service',
    'metrics-backend',
    'trace-store',
    'k8s-api',
    'vector-store',
  ]);

  const visibleSpans = (pruned: Set<string>) =>
    generateRowStates(trace.spans, new Set(), new Map(), 'inline', hiddenFor(trace.spans, ...pruned)).filter(
      r => !('isPrunedPlaceholder' in r)
    );

  it('carries GenAI spans in exactly two of its ten services', () => {
    const genAIServices = new Set(
      trace.spans.filter(s => s.genAIKind !== undefined).map(s => s.resource.serviceName)
    );
    expect(new Set(trace.spans.map(s => s.resource.serviceName)).size).toBe(10);
    expect(genAIServices).toEqual(new Set(['coding-agent', 'summarizer-agent']));
  });

  it('runs every span inside its parent and no two siblings at the same time', () => {
    const byID = new Map(trace.spans.map(s => [s.spanID, s]));
    const end = (s: IOtelSpan) => s.startTime + s.duration;
    const lastEndUnder = new Map<string, number>();
    for (const s of trace.spans) {
      const parent = s.parentSpanID ? byID.get(s.parentSpanID) : undefined;
      if (!parent) continue;
      expect(s.startTime).toBeGreaterThanOrEqual(parent.startTime);
      expect(end(s)).toBeLessThanOrEqual(end(parent));
      expect(s.startTime).toBeGreaterThanOrEqual(lastEndUnder.get(parent.spanID) ?? 0);
      lastEndUnder.set(parent.spanID, end(s));
    }
  });

  it('pruning a plain tier above the agent hides every GenAI span below it', () => {
    // graphql-gateway sits between the root service and the agent, so pruning it removes
    // the agent's whole subtree. Any automatically derived pruned set has to account for
    // this, since pruning is decided per service but applies to the entire subtree.
    const visible = visibleSpans(new Set(['graphql-gateway']));
    expect(visible.filter(r => r.span.genAIKind !== undefined)).toHaveLength(0);
    expect(visible.map(r => r.span.resource.serviceName)).toEqual(['api-edge']);
  });

  it('pruning only the plain leaf services keeps the whole GenAI path visible', () => {
    const visible = visibleSpans(PLAIN_LEAF_SERVICES);
    const services = new Set(visible.map(r => r.span.resource.serviceName));
    expect(services).toEqual(
      new Set(['api-edge', 'graphql-gateway', 'coding-agent', 'mcp-gateway', 'summarizer-agent'])
    );
    // Both the agent and the nested agent keep their GenAI spans.
    const genAICount = trace.spans.filter(s => s.genAIKind !== undefined).length;
    expect(visible.filter(r => r.span.genAIKind !== undefined)).toHaveLength(genAICount);
  });

  it('reports every pruned span and the error among them in placeholder rows', () => {
    const rows = generateRowStates(
      trace.spans,
      new Set(),
      new Map(),
      'inline',
      hiddenFor(trace.spans, ...PLAIN_LEAF_SERVICES)
    );
    const placeholders = rows.filter(r => 'isPrunedPlaceholder' in r);
    const hidden = trace.spans.filter(s => PLAIN_LEAF_SERVICES.has(s.resource.serviceName)).length;
    expect(placeholders.reduce((sum, p) => sum + p.prunedChildrenCount, 0)).toBe(hidden);
    expect(placeholders.reduce((sum, p) => sum + p.prunedErrorCount, 0)).toBe(1);
  });
});
