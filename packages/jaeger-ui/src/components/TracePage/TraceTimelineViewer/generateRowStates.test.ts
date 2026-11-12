// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import genaiTestTrace from './genaiTestTrace.json';
import DetailState from './SpanDetail/DetailState';
import { IOtelSpan, StatusCode } from '../../../types/otel';
import { makeAttributes } from '../../../model/attributes';
import transformTraceData from '../../../model/transform-trace-data';
import generateRowStates, { collapseTargets, RECORDED_TREE } from './generateRowStates';
import { EMPTY_SPAN_FILTER, evaluateSpanFilter, ISpanFilter, withHiddenServices } from '../spanFilter';

function makeSpan(overrides: Partial<IOtelSpan> & { spanID: string; depth: number }): IOtelSpan {
  return {
    hasChildren: false,
    childSpans: [],
    parentSpan: undefined,
    attributes: makeAttributes(),
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

// The rows alone, for the tests that assert on them.
const rowsOf = (...args: Parameters<typeof generateRowStates>) => generateRowStates(...args).rows;

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
    expect(rowsOf(null, new Set(), new Map(), 'inline', new Set())).toEqual([]);
  });

  it('returns all spans when no collapse or pruning', () => {
    const spans = makeTestSpans();
    const rows = rowsOf(spans, new Set(), new Map(), 'inline', new Set());
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-1', 'span-2', 'span-3']);
  });

  it('collapses children when span is in childrenHiddenIDs', () => {
    const spans = makeTestSpans();
    const rows = rowsOf(spans, new Set(['span-1']), new Map(), 'inline', new Set());
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-1', 'span-3']);
  });

  it('adds detail rows for spans in detailStates (inline mode)', () => {
    const spans = makeTestSpans();
    const details = new Map([['span-1', new DetailState()]]);
    const rows = rowsOf(spans, new Set(), details, 'inline', new Set());
    const detailRows = rows.filter(r => r.isDetail);
    expect(detailRows).toHaveLength(1);
    expect(detailRows[0].span.spanID).toBe('span-1');
  });

  it('skips detail rows in sidepanel mode', () => {
    const spans = makeTestSpans();
    const details = new Map([['span-1', new DetailState()]]);
    const rows = rowsOf(spans, new Set(), details, 'sidepanel', new Set());
    expect(rows.filter(r => r.isDetail)).toHaveLength(0);
  });

  describe('service filter pruning', () => {
    it('prunes spans of a pruned service and their subtrees', () => {
      const spans = makeTestSpans();
      const rows = rowsOf(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-b'));
      const spanIDs = rows.filter(r => !('isPrunedPlaceholder' in r)).map(r => r.span.spanID);
      expect(spanIDs).toEqual(['span-0', 'span-3']);
    });

    it('renders no rows and no placeholder when the root itself is hidden', () => {
      const spans = makeTestSpans();
      const rows = rowsOf(spans, new Set(), new Map(), 'inline', new Set(spans.map(s => s.spanID)));
      expect(rows).toEqual([]);
    });

    it('inserts a pruned placeholder with total subtree count', () => {
      const spans = makeTestSpans();
      const rows = rowsOf(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-b'));
      const placeholders = rows.filter(r => 'isPrunedPlaceholder' in r);
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].prunedChildrenCount).toBe(2); // span-1 + span-2
      expect(placeholders[0].span.spanID).toBe('span-0'); // parent
    });

    it('counts errors in pruned subtrees', () => {
      const spans = makeTestSpans();
      const rows = rowsOf(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-b'));
      const placeholder = rows.find(r => 'isPrunedPlaceholder' in r);
      expect(placeholder!.prunedErrorCount).toBe(1);
    });

    it('produces no placeholders when nothing is hidden', () => {
      const spans = makeTestSpans();
      const rows = rowsOf(spans, new Set(), new Map(), 'inline', new Set());
      expect(rows.filter(r => 'isPrunedPlaceholder' in r)).toHaveLength(0);
    });

    it('places placeholder after visible children of the parent', () => {
      const spans = makeTestSpans();
      // Prune svc-c (span-3); span-0's visible children are span-1 subtree, placeholder should be last
      const rows = rowsOf(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-c'));
      const lastRow = rows[rows.length - 1];
      expect('isPrunedPlaceholder' in lastRow).toBe(true);
      expect(lastRow.span.spanID).toBe('span-0');
    });

    it('assigns non-decreasing spanIndex to placeholder rows', () => {
      const spans = makeTestSpans();
      // Prune svc-c (span-3, index 3 in the spans array)
      const rows = rowsOf(spans, new Set(), new Map(), 'inline', hiddenFor(spans, 'svc-c'));
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
    rowsOf(trace.spans, new Set(), new Map(), 'inline', hiddenFor(trace.spans, ...pruned)).filter(
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
    const rows = rowsOf(
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

describe('generateRowStates in lift mode', () => {
  // span-1 carries an attribute so that a filter can hide it alone, and span-2 stays visible under it.
  function makeLiftSpans(): IOtelSpan[] {
    const spans = makeTestSpans();
    const [root, mid, leaf, sibling] = spans;
    (mid as unknown as { attributes: IOtelSpan['attributes'] }).attributes = makeAttributes([
      { key: 'tier', value: 'mid' },
    ]);
    (root as unknown as { childSpans: IOtelSpan[] }).childSpans = [mid, sibling];
    (mid as unknown as { childSpans: IOtelSpan[] }).childSpans = [leaf];
    (mid as unknown as { parentSpan: IOtelSpan }).parentSpan = root;
    (leaf as unknown as { parentSpan: IOtelSpan }).parentSpan = mid;
    (sibling as unknown as { parentSpan: IOtelSpan }).parentSpan = root;
    return spans;
  }
  const hideMid: ISpanFilter = {
    clauses: [{ verb: 'hide', criterion: { shape: 'attr', text: 'tier:mid' } }],
    treeMode: 'lift',
  };
  const liftHidden = (spans: ReadonlyArray<IOtelSpan>, filter: ISpanFilter) =>
    evaluateSpanFilter(spans, filter).hiddenIDs;

  it('lifts the children of a hidden span to its parent and keeps no placeholder', () => {
    const spans = makeLiftSpans();
    const { rows, tree } = generateRowStates(
      spans,
      new Set(),
      new Map(),
      'inline',
      liftHidden(spans, hideMid),
      'lift'
    );
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-2', 'span-3']);
    expect(rows.some(r => 'isPrunedPlaceholder' in r)).toBe(false);
    const [root, mid, leaf, sibling] = spans;
    expect(tree.parentOf(leaf)).toBe(root);
    expect(tree.parentOf(sibling)).toBe(root);
    expect(tree.parentOf(root)).toBeNull();
    expect(tree.liftedPast(leaf)).toEqual([mid]);
    expect(tree.liftedPast(sibling)).toEqual([]);
    expect(tree.childCount(root)).toBe(2);
    expect(tree.childCount(leaf)).toBe(0);
    expect(tree.isLastChild(leaf)).toBe(false);
    expect(tree.isLastChild(sibling)).toBe(true);
    expect(tree.isLastChild(root)).toBe(false);
  });

  it('skips detail rows in sidepanel mode', () => {
    const spans = makeLiftSpans();
    const details = new Map([['span-2', new DetailState()]]);
    const { rows } = generateRowStates(
      spans,
      new Set(),
      details,
      'sidepanel',
      liftHidden(spans, hideMid),
      'lift'
    );
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-2', 'span-3']);
    expect(rows.some(r => r.isDetail)).toBe(false);
  });

  it('credits the errors of hidden spans to the nearest visible ancestor', () => {
    const spans = makeLiftSpans();
    const hideSvcB: ISpanFilter = withHiddenServices(
      { ...EMPTY_SPAN_FILTER, treeMode: 'lift' },
      new Set(['svc-b'])
    );
    const { rows, tree } = generateRowStates(
      spans,
      new Set(),
      new Map(),
      'inline',
      liftHidden(spans, hideSvcB),
      'lift'
    );
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-3']);
    expect(tree.hiddenErrors(spans[0]).map(s => s.spanID)).toEqual(['span-2']);
    expect(tree.hiddenErrors(spans[3])).toEqual([]);
    expect(tree.hiddenErrorIDs(spans[0])).toEqual(new Set(['span-2']));
    expect(tree.hiddenErrorIDs(spans[0])).toBe(tree.hiddenErrorIDs(spans[0]));
    expect(tree.hiddenErrorIDs(spans[3])).toBe(RECORDED_TREE.hiddenErrorIDs(spans[3]));
    expect(tree.childCount(spans[0])).toBe(1);
  });

  it('collapses lifted children with their visible parent and keeps the child count', () => {
    const spans = makeLiftSpans();
    const { rows, tree } = generateRowStates(
      spans,
      new Set(['span-0']),
      new Map(),
      'inline',
      liftHidden(spans, hideMid),
      'lift'
    );
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0']);
    expect(tree.childCount(spans[0])).toBe(2);
  });

  it('ignores the collapse state of a hidden span, which has no row to expand it from', () => {
    const spans = makeLiftSpans();
    const { rows } = generateRowStates(
      spans,
      new Set(['span-1']),
      new Map(),
      'inline',
      liftHidden(spans, hideMid),
      'lift'
    );
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-2', 'span-3']);
  });

  it('does not treat the lifted children of a hidden sibling of a collapsed span as collapsed', () => {
    const spans = makeLiftSpans();
    // Collapse span-3 (a leaf, so collapsing it hides nothing) and hide span-1; span-2 at depth 2
    // follows a collapsed span at depth 1 in trace order only if we reorder, so build that order.
    const [root, mid, leaf, sibling] = spans;
    (root as unknown as { childSpans: IOtelSpan[] }).childSpans = [sibling, mid];
    const reordered = [root, sibling, mid, leaf];
    const { rows } = generateRowStates(
      reordered,
      new Set(['span-3']),
      new Map(),
      'inline',
      liftHidden(reordered, hideMid),
      'lift'
    );
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-3', 'span-2']);
  });

  it('keeps the tree identity across collapse and detail changes', () => {
    const spans = makeLiftSpans();
    const hidden = liftHidden(spans, hideMid);
    const open = generateRowStates(spans, new Set(), new Map(), 'inline', hidden, 'lift');
    const collapsed = generateRowStates(spans, new Set(['span-0']), new Map(), 'inline', hidden, 'lift');
    const detailed = generateRowStates(
      spans,
      new Set(),
      new Map([['span-2', new DetailState()]]),
      'inline',
      hidden,
      'lift'
    );
    expect(collapsed.tree).toBe(open.tree);
    expect(detailed.tree).toBe(open.tree);
    expect(detailed.rows.map(r => `${r.span.spanID}${r.isDetail ? ':detail' : ''}`)).toEqual([
      'span-0',
      'span-2',
      'span-2:detail',
      'span-3',
    ]);
  });

  it('lifts the children of a hidden root as roots and credits its errors to nobody', () => {
    const spans = makeLiftSpans();
    const [root, mid, leaf, sibling] = spans;
    (root as unknown as { status: IOtelSpan['status'] }).status = { code: StatusCode.ERROR };
    const hideRoot: ISpanFilter = withHiddenServices(
      { ...EMPTY_SPAN_FILTER, treeMode: 'lift' },
      new Set(['svc-a'])
    );
    const { rows, tree } = generateRowStates(
      spans,
      new Set(),
      new Map(),
      'inline',
      liftHidden(spans, hideRoot),
      'lift'
    );
    expect(rows.map(r => r.span.spanID)).toEqual(['span-1', 'span-2', 'span-3']);
    expect(tree.parentOf(mid)).toBeNull();
    expect(tree.parentOf(sibling)).toBeNull();
    expect(tree.isLastChild(sibling)).toBe(false);
    expect(tree.liftedPast(mid)).toEqual([root]);
    expect(tree.parentOf(leaf)).toBe(mid);
    expect(tree.hiddenErrors(mid)).toEqual([]);
    expect(tree.hiddenErrors(sibling)).toEqual([]);
  });

  it('lifts past two consecutive hidden spans and names both, outermost first', () => {
    const spans = makeLiftSpans();
    const [root, mid, leaf] = spans;
    const hideSvcB: ISpanFilter = {
      clauses: [{ verb: 'hide', criterion: { shape: 'set', property: 'service', values: ['svc-b'] } }],
      treeMode: 'lift',
    };
    // Make the leaf a visible service so that it is lifted past mid, and add a hidden grandchild
    // chain: root > mid(hidden) > leaf(hidden) > deep(visible).
    const deep = makeSpan({
      spanID: 'span-4',
      depth: 3,
      resource: { serviceName: 'svc-c', attributes: makeAttributes() },
    });
    (deep as unknown as { parentSpan: IOtelSpan }).parentSpan = leaf;
    (leaf as unknown as { childSpans: IOtelSpan[] }).childSpans = [deep];
    (leaf as unknown as { hasChildren: boolean }).hasChildren = true;
    const withDeep = [root, mid, leaf, deep, spans[3]];
    const { rows, tree } = generateRowStates(
      withDeep,
      new Set(),
      new Map(),
      'inline',
      liftHidden(withDeep, hideSvcB),
      'lift'
    );
    expect(rows.map(r => r.span.spanID)).toEqual(['span-0', 'span-4', 'span-3']);
    expect(tree.parentOf(deep)).toBe(root);
    expect(tree.liftedPast(deep)).toEqual([mid, leaf]);
    expect(tree.isLastChild(deep)).toBe(false);
    expect(tree.isLastChild(spans[3])).toBe(true);
    expect(tree.childCount(root)).toBe(2);
  });

  it('marks a lifted row that ends its visible parent as the last child', () => {
    const spans = makeLiftSpans();
    const [root, mid, leaf, sibling] = spans;
    (root as unknown as { childSpans: IOtelSpan[] }).childSpans = [sibling, mid];
    const reordered = [root, sibling, mid, leaf];
    const { tree } = generateRowStates(
      reordered,
      new Set(),
      new Map(),
      'inline',
      liftHidden(reordered, hideMid),
      'lift'
    );
    expect(tree.isLastChild(leaf)).toBe(true);
    expect(tree.isLastChild(sibling)).toBe(false);
  });

  it('falls back to the span tree when nothing is hidden', () => {
    const spans = makeLiftSpans();
    const { rows, tree } = generateRowStates(spans, new Set(), new Map(), 'inline', new Set(), 'lift');
    expect(rows).toHaveLength(4);
    expect(tree).toBe(RECORDED_TREE);
  });

  describe('the worked example of RFC 0009 on genaiTestTrace.json', () => {
    const trace = transformTraceData(genaiTestTrace as never)!.asOtelTrace();
    const rowStates = (filter: ISpanFilter) =>
      generateRowStates(
        trace.spans,
        new Set(),
        new Map(),
        'inline',
        evaluateSpanFilter(trace.spans, filter).hiddenIDs,
        filter.treeMode
      );
    const rowCount = (filter: ISpanFilter) => rowStates(filter).rows;

    it('shows every span without clauses', () => {
      expect(rowCount(EMPTY_SPAN_FILTER)).toHaveLength(59);
    });

    it('hides the five leaf services in remove mode as 34 spans and 10 placeholders', () => {
      const rows = rowCount(
        withHiddenServices(
          EMPTY_SPAN_FILTER,
          new Set(['auth-service', 'metrics-backend', 'trace-store', 'k8s-api', 'vector-store'])
        )
      );
      expect(rows.filter(r => !('isPrunedPlaceholder' in r))).toHaveLength(34);
      expect(rows.filter(r => 'isPrunedPlaceholder' in r)).toHaveLength(10);
    });

    it('hides the non-GenAI spans in lift mode as 18 rows with the agent as the root', () => {
      const { rows, tree } = rowStates({
        clauses: [{ verb: 'hide', criterion: { shape: 'set', property: 'spanType', values: ['none'] } }],
        treeMode: 'lift',
      });
      expect(rows).toHaveLength(18);
      expect(rows.every(r => r.span.genAIKind !== undefined)).toBe(true);
      const round = [
        ['coding-agent chat model-a', 1],
        ['coding-agent execute_tool list_dashboards', 1],
        ['coding-agent execute_tool search_traces', 1],
        ['coding-agent retrieval vector-search', 1],
      ];
      expect(rows.map(r => [`${r.span.resource.serviceName} ${r.span.name}`, tree.depthOf(r.span)])).toEqual([
        ['coding-agent invoke_agent triage-agent', 0],
        ...round,
        ...round,
        ...round,
        ['coding-agent execute_tool summarize_findings', 1],
        ['summarizer-agent invoke_agent summarizer', 2],
        ['summarizer-agent chat model-b', 3],
        ['coding-agent chat model-a', 1],
        ['coding-agent chat model-multimodal', 1],
      ]);
    });

    it('keeps only the error span in lift mode, drawn as a root', () => {
      const { rows, tree } = rowStates({
        clauses: [{ verb: 'keep', criterion: { shape: 'set', property: 'status', values: ['error'] } }],
        treeMode: 'lift',
      });
      expect(rows.map(r => `${r.span.resource.serviceName} ${r.span.name}`)).toEqual([
        'k8s-api GET /api/v1/pods',
      ]);
      const [errorSpan] = rows.map(r => r.span);
      expect(tree.depthOf(errorSpan)).toBe(0);
      expect(tree.parentOf(errorSpan)).toBeNull();
      expect(tree.liftedPast(errorSpan)).toHaveLength(errorSpan.depth);
    });
  });
});

describe('collapseTargets', () => {
  const spans = makeTestSpans();

  it('returns the spans themselves when nothing is hidden', () => {
    expect(collapseTargets(spans, new Set(), 'lift')).toBe(spans);
  });

  it('drops the hidden spans and keeps the recorded depth in remove mode', () => {
    const targets = collapseTargets(spans, new Set(['span-1', 'span-2']), 'remove');
    expect(targets.map(t => [t.spanID, t.depth, t.hasChildren])).toEqual([
      ['span-0', 0, true],
      ['span-3', 1, false],
    ]);
  });

  it('gives a lifted span the depth and the child test of the drawn tree', () => {
    const targets = collapseTargets(spans, new Set(['span-1']), 'lift');
    expect(targets.map(t => [t.spanID, t.depth, t.hasChildren])).toEqual([
      ['span-0', 0, true],
      ['span-2', 1, false],
      ['span-3', 1, false],
    ]);
  });

  it('reports no children for a span whose every child is hidden', () => {
    const targets = collapseTargets(spans, new Set(['span-2']), 'lift');
    expect(targets.find(t => t.spanID === 'span-1')).toEqual({
      spanID: 'span-1',
      depth: 1,
      hasChildren: false,
    });
  });

  it('makes the children of a hidden root roots', () => {
    const targets = collapseTargets(spans, new Set(['span-0']), 'lift');
    expect(targets.map(t => [t.spanID, t.depth])).toEqual([
      ['span-1', 0],
      ['span-2', 1],
      ['span-3', 0],
    ]);
  });
});
