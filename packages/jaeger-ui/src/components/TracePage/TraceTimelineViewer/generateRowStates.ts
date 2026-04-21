// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import DetailState from './SpanDetail/DetailState';
import { isErrorSpan } from './utils';
import { TNil } from '../../../types';
import { IOtelSpan } from '../../../types/otel';

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

type PrunedStats = {
  childCounts: number[];
  errorCounts: number[];
};

/**
 * First pass: build visible rows by applying manual collapse and service filter pruning.
 * Returns the visible rows and, when pruning is active, per-row pruned span/error counts.
 */
function buildVisibleRows(
  spans: ReadonlyArray<IOtelSpan>,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>,
  detailPanelMode: 'inline' | 'sidepanel',
  prunedServices: Set<string>
): { rows: RowState[]; prunedStats: PrunedStats | null } {
  const hasPruning = prunedServices.size > 0;
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

    // Service filter pruning: skip this span and its entire subtree.
    if (hasPruning && prunedServices.has(span.resource.serviceName)) {
      let prunedSpanCount = 1;
      let prunedErrors = isErrorSpan(span) ? 1 : 0;
      while (i + 1 < spans.length && spans[i + 1].depth > depth) {
        i++;
        prunedSpanCount++;
        if (isErrorSpan(spans[i])) {
          prunedErrors++;
        }
      }
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
 * Build the visible row list from a trace's spans, applying manual collapse,
 * service filter pruning, and pruned placeholder insertion.
 */
export default function generateRowStates(
  spans: ReadonlyArray<IOtelSpan> | TNil,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>,
  detailPanelMode: 'inline' | 'sidepanel',
  prunedServices: Set<string>
): RowState[] {
  if (!spans) {
    return [];
  }
  const { rows, prunedStats } = buildVisibleRows(
    spans,
    childrenHiddenIDs,
    detailStates,
    detailPanelMode,
    prunedServices
  );
  return prunedStats ? insertPrunedPlaceholders(rows, prunedStats) : rows;
}

/**
 * Returns true if a span would be pruned by the service filter.
 * A span is pruned if its own service or any ancestor's service is in prunedServices.
 */
export function isSpanPruned(span: IOtelSpan, prunedServices: Set<string>): boolean {
  if (prunedServices.size === 0) return false;
  let current: IOtelSpan | undefined = span;
  while (current) {
    if (prunedServices.has(current.resource.serviceName)) return true;
    current = current.parentSpan;
  }
  return false;
}

/**
 * Filter a set of span IDs to exclude spans that would be pruned by the service filter.
 * Used to ensure uiFind match counts and highlighting exclude invisible pruned spans.
 */
export function filterPrunedSpanIDs(
  spanIDs: Set<string> | TNil,
  spanMap: ReadonlyMap<string, IOtelSpan>,
  prunedServices: Set<string>
): Set<string> | TNil {
  if (!spanIDs || prunedServices.size === 0) return spanIDs;
  const filtered = new Set<string>();
  for (const id of spanIDs) {
    const span = spanMap.get(id);
    if (span && !isSpanPruned(span, prunedServices)) {
      filtered.add(id);
    }
  }
  return filtered.size > 0 ? filtered : null;
}
