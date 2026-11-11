// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';

import DetailState from './SpanDetail/DetailState';
import { CollapseTarget } from './timeline-utils';
import { isErrorSpan } from './utils';
import { TNil } from '../../../types';
import { IOtelSpan } from '../../../types/otel';
import { TreeMode } from '../spanFilter';

export type RowState =
  | {
      isDetail: boolean;
      span: IOtelSpan;
      spanIndex: number;
    }
  | {
      isDetail: false;
      span: IOtelSpan;
      spanIndex: number;
      isPrunedPlaceholder: true;
      prunedChildrenCount: number;
      prunedErrorCount: number;
    };

/**
 * The tree that the rows draw. In remove mode it is the span tree itself. In lift mode the visible
 * children of a hidden span take its place under its nearest visible ancestor, so the parent, the
 * indent depth and the last-child test of a row differ from the span's own fields.
 */
export type VisibleTree = {
  /** The nearest visible ancestor, or null when the span is drawn as a root. */
  parentOf(span: IOtelSpan): IOtelSpan | null;
  /** Whether the span is the last visible child of its visible parent; false for a root. */
  isLastChild(span: IOtelSpan): boolean;
  /** The indent depth of the span's row: the number of its visible ancestors. */
  depthOf(span: IOtelSpan): number;
  /** The number of children the row's box shows; zero for a leaf. */
  childCount(span: IOtelSpan): number;
  /** The hidden spans between the span and its visible parent, outermost first; empty unless lifted. */
  liftedPast(span: IOtelSpan): ReadonlyArray<IOtelSpan>;
  /** The hidden error spans credited to the span's row, in trace order. */
  hiddenErrors(span: IOtelSpan): ReadonlyArray<IOtelSpan>;
  /** The IDs of hiddenErrors(span), built once per span so that a redraw does not rebuild them. */
  hiddenErrorIDs(span: IOtelSpan): ReadonlySet<string>;
};

const NO_SPANS: ReadonlyArray<IOtelSpan> = [];
const NO_IDS: ReadonlySet<string> = new Set();

/** The span tree as recorded, which is what remove mode draws. */
export const SPAN_TREE: VisibleTree = {
  parentOf: span => span.parentSpan ?? null,
  isLastChild: span => {
    const parent = span.parentSpan;
    return parent ? parent.childSpans[parent.childSpans.length - 1]?.spanID === span.spanID : false;
  },
  depthOf: span => span.depth,
  childCount: span => span.childSpans.length,
  liftedPast: () => NO_SPANS,
  hiddenErrors: () => NO_SPANS,
  hiddenErrorIDs: () => NO_IDS,
};

export type RowStates = {
  rows: RowState[];
  tree: VisibleTree;
};

type PrunedStats = {
  childCounts: number[];
  errorCounts: number[];
};

/**
 * First pass of remove mode: build visible rows by applying manual collapse and the filter's hidden
 * span set, where a hidden span takes its subtree with it. Returns the visible rows and, when
 * anything is hidden, per-row pruned span/error counts.
 *
 * Assumes spans are in pre-order DFS order (parent before its children, siblings sorted by
 * startTime). This is guaranteed by the trace transformation in transform-trace-data.ts.
 */
function buildVisibleRows(
  spans: ReadonlyArray<IOtelSpan>,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>,
  detailPanelMode: 'inline' | 'sidepanel',
  hiddenIDs: ReadonlySet<string>
): { rows: RowState[]; prunedStats: PrunedStats | null } {
  const hasPruning = hiddenIDs.size > 0;
  let collapseDepth: number | null = null;
  const rows: RowState[] = [];

  // parentByDepth[d] = index into rows of the last emitted span at depth d.
  const parentByDepth: (number | undefined)[] = [];
  const childCounts: number[] = [];
  const errorCounts: number[] = [];

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const { spanID, depth } = span;

    // Exit collapsed subtree when we return to or above collapse depth.
    if (collapseDepth != null) {
      if (depth >= collapseDepth) {
        continue;
      }
      collapseDepth = null;
    }

    // A hidden span is skipped together with its entire subtree.
    if (hasPruning && hiddenIDs.has(spanID)) {
      let prunedSpanCount = 1;
      let prunedErrors = isErrorSpan(span) ? 1 : 0;
      while (i + 1 < spans.length && spans[i + 1].depth > depth) {
        i++;
        prunedSpanCount++;
        if (isErrorSpan(spans[i])) {
          prunedErrors++;
        }
      }
      // A hidden root has no parent row to attach a placeholder to, so its stats are dropped. The
      // service filter protects root services, but a clause from the URL can hide a root.
      if (depth > 0) {
        const parentIdx = parentByDepth[depth - 1];
        if (parentIdx != null) {
          childCounts[parentIdx] = (childCounts[parentIdx] || 0) + prunedSpanCount;
          if (prunedErrors > 0) {
            errorCounts[parentIdx] = (errorCounts[parentIdx] || 0) + prunedErrors;
          }
        }
      }
      continue;
    }

    // Manual collapse.
    if (childrenHiddenIDs.has(spanID)) {
      collapseDepth = depth + 1;
    }

    parentByDepth[depth] = rows.length;
    rows.push({ span, isDetail: false, spanIndex: i });

    // In side panel mode, detail rows are shown in the panel, not inline.
    if (detailPanelMode !== 'sidepanel' && detailStates.has(spanID)) {
      rows.push({ span, isDetail: true, spanIndex: i });
    }
  }

  return {
    rows,
    prunedStats: hasPruning ? { childCounts, errorCounts } : null,
  };
}

/**
 * Second pass: interleave pruned placeholder rows at the end of each parent's
 * visible subtree using a depth stack (single linear scan, no splicing).
 *
 * Placeholders are always appended after all visible siblings of the pruned spans,
 * not at the original position of the first pruned child. This is intentional:
 * it keeps the visible children contiguous and avoids mid-list synthetic rows.
 */
function insertPrunedPlaceholders(rows: RowState[], stats: PrunedStats): RowState[] {
  const { childCounts, errorCounts } = stats;
  const result: RowState[] = [];
  // Track the max spanIndex seen within each open subtree so placeholders
  // get a non-decreasing spanIndex (avoids confusing ScrollManager navigation).
  const openStack: Array<{ rowIndex: number; depth: number; maxSpanIndex: number }> = [];

  const maybeAppendPlaceholder = (entry: { rowIndex: number; maxSpanIndex: number }) => {
    const count = childCounts[entry.rowIndex];
    if (!count) return;
    const parentRow = rows[entry.rowIndex];
    result.push({
      span: parentRow.span,
      isDetail: false,
      spanIndex: entry.maxSpanIndex,
      isPrunedPlaceholder: true,
      prunedChildrenCount: count,
      prunedErrorCount: errorCounts[entry.rowIndex] || 0,
    });
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.isDetail) {
      while (openStack.length && openStack[openStack.length - 1].depth >= row.span.depth) {
        const closed = openStack.pop()!;
        maybeAppendPlaceholder(closed);
        // Propagate max spanIndex to the parent entry on the stack.
        if (openStack.length) {
          const parent = openStack[openStack.length - 1];
          parent.maxSpanIndex = Math.max(parent.maxSpanIndex, closed.maxSpanIndex);
        }
      }
    }
    result.push(row);
    if (!row.isDetail) {
      const spanIndex = row.spanIndex;
      // Update the current top-of-stack's max with this row's spanIndex.
      if (openStack.length) {
        const top = openStack[openStack.length - 1];
        top.maxSpanIndex = Math.max(top.maxSpanIndex, spanIndex);
      }
      openStack.push({ rowIndex: i, depth: row.span.depth, maxSpanIndex: spanIndex });
    }
  }
  while (openStack.length) {
    const closed = openStack.pop()!;
    maybeAppendPlaceholder(closed);
    if (openStack.length) {
      const parent = openStack[openStack.length - 1];
      parent.maxSpanIndex = Math.max(parent.maxSpanIndex, closed.maxSpanIndex);
    }
  }

  return result;
}

/**
 * The tree that lift mode draws: a hidden span is skipped on its own and its visible children are
 * drawn under its nearest visible ancestor, in trace order. The pass keeps, per depth, the nearest
 * visible ancestor-or-self of the last span seen there, so the visible parent of a span is one
 * array lookup. It records that parent per span, because the indent guides walk the visible
 * ancestors of every rendered row, and per visible span its last visible child, its visible child
 * count and the hidden error spans whose nearest visible ancestor it is. A hidden span with no
 * visible ancestor, which is a hidden root, has no row to credit its errors to. The tree depends
 * only on the spans and the hidden set, so it is built once per filter result and its identity
 * survives a collapse or a detail toggle.
 */
function buildLiftedTree(spans: ReadonlyArray<IOtelSpan>, hiddenIDs: ReadonlySet<string>): VisibleTree {
  const visibleParents = new Map<string, IOtelSpan | null>();
  const depths = new Map<string, number>();
  const lastVisibleChild = new Map<string, string>();
  const childCounts = new Map<string, number>();
  const hiddenErrors = new Map<string, IOtelSpan[]>();
  const hiddenErrorIDs = new Map<string, ReadonlySet<string>>();
  const nearestVisible: (IOtelSpan | null)[] = [];

  for (const span of spans) {
    const { spanID, depth } = span;
    const visibleParent = depth > 0 ? (nearestVisible[depth - 1] ?? null) : null;
    if (hiddenIDs.has(spanID)) {
      nearestVisible[depth] = visibleParent;
      if (visibleParent && isErrorSpan(span)) {
        const credited = hiddenErrors.get(visibleParent.spanID);
        if (credited) credited.push(span);
        else hiddenErrors.set(visibleParent.spanID, [span]);
      }
      continue;
    }
    nearestVisible[depth] = span;
    visibleParents.set(spanID, visibleParent);
    depths.set(spanID, visibleParent ? depths.get(visibleParent.spanID)! + 1 : 0);
    if (visibleParent) {
      lastVisibleChild.set(visibleParent.spanID, spanID);
      childCounts.set(visibleParent.spanID, (childCounts.get(visibleParent.spanID) ?? 0) + 1);
    }
  }

  const parentOf = (span: IOtelSpan): IOtelSpan | null => visibleParents.get(span.spanID) ?? null;

  return {
    parentOf,
    isLastChild: span => {
      const parent = parentOf(span);
      return parent ? lastVisibleChild.get(parent.spanID) === span.spanID : false;
    },
    depthOf: span => depths.get(span.spanID) ?? 0,
    childCount: span => childCounts.get(span.spanID) ?? 0,
    liftedPast: span => {
      if (!span.parentSpan || !hiddenIDs.has(span.parentSpan.spanID)) return NO_SPANS;
      const passed: IOtelSpan[] = [];
      let parent: IOtelSpan | undefined = span.parentSpan;
      while (parent && hiddenIDs.has(parent.spanID)) {
        passed.push(parent);
        parent = parent.parentSpan;
      }
      return passed.reverse();
    },
    hiddenErrors: span => hiddenErrors.get(span.spanID) ?? NO_SPANS,
    hiddenErrorIDs: span => {
      const errors = hiddenErrors.get(span.spanID);
      if (!errors) return NO_IDS;
      let ids = hiddenErrorIDs.get(span.spanID);
      if (!ids) {
        ids = new Set(errors.map(s => s.spanID));
        hiddenErrorIDs.set(span.spanID, ids);
      }
      return ids;
    },
  };
}

const memoizedLiftedTree = memoizeOne(buildLiftedTree);

/**
 * Lift mode rows. Manual collapse hides every descendant of the collapsed span, lifted or not, and
 * the collapse state of a hidden span has no effect because that span has no row to expand it from.
 */
function buildLiftedRows(
  spans: ReadonlyArray<IOtelSpan>,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>,
  detailPanelMode: 'inline' | 'sidepanel',
  hiddenIDs: ReadonlySet<string>
): RowState[] {
  const rows: RowState[] = [];
  let collapseDepth: number | null = null;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const { spanID, depth } = span;

    // Exit the collapsed subtree when we return to or above the collapse depth. A hidden span
    // exits it too, so that its lifted children are not mistaken for collapsed descendants.
    if (collapseDepth != null && depth < collapseDepth) {
      collapseDepth = null;
    }
    if (hiddenIDs.has(spanID) || collapseDepth != null) continue;
    if (childrenHiddenIDs.has(spanID)) {
      collapseDepth = depth + 1;
    }

    rows.push({ span, isDetail: false, spanIndex: i });
    if (detailPanelMode !== 'sidepanel' && detailStates.has(spanID)) {
      rows.push({ span, isDetail: true, spanIndex: i });
    }
  }
  return rows;
}

/**
 * The spans that the bulk collapse actions walk, in trace order, at the depth and with the
 * children they have in the drawn tree. A hidden span has no row, so it is left out in both
 * modes; in lift mode a lifted span sits one level below its nearest visible ancestor.
 */
export function collapseTargets(
  spans: ReadonlyArray<IOtelSpan>,
  hiddenIDs: ReadonlySet<string>,
  treeMode: TreeMode
): ReadonlyArray<CollapseTarget> {
  if (hiddenIDs.size === 0) return spans;
  if (treeMode !== 'lift') return spans.filter(s => !hiddenIDs.has(s.spanID));
  const tree = memoizedLiftedTree(spans, hiddenIDs);
  return spans
    .filter(s => !hiddenIDs.has(s.spanID))
    .map(s => ({ spanID: s.spanID, depth: tree.depthOf(s), hasChildren: tree.childCount(s) > 0 }));
}

/**
 * Build the visible row list from a trace's spans, applying manual collapse, the filter's hidden
 * span set and the tree mode, plus pruned placeholder insertion in remove mode. The result also
 * carries the tree that the rows draw.
 */
export default function generateRowStates(
  spans: ReadonlyArray<IOtelSpan> | TNil,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>,
  detailPanelMode: 'inline' | 'sidepanel',
  hiddenIDs: ReadonlySet<string>,
  treeMode: TreeMode = 'remove'
): RowStates {
  if (!spans) {
    return { rows: [], tree: SPAN_TREE };
  }
  if (treeMode === 'lift' && hiddenIDs.size > 0) {
    return {
      rows: buildLiftedRows(spans, childrenHiddenIDs, detailStates, detailPanelMode, hiddenIDs),
      tree: memoizedLiftedTree(spans, hiddenIDs),
    };
  }
  const { rows, prunedStats } = buildVisibleRows(
    spans,
    childrenHiddenIDs,
    detailStates,
    detailPanelMode,
    hiddenIDs
  );
  return { rows: prunedStats ? insertPrunedPlaceholders(rows, prunedStats) : rows, tree: SPAN_TREE };
}
