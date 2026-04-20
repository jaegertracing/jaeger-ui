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
    // TODO: uiFind (calculateFocusedFindRowStates) still matches against all spans
    // including pruned ones, which can affect childrenHiddenIDs/detailStates for
    // invisible spans. This has no visual effect (pruned rows are removed here),
    // but ideally uiFind should exclude pruned services upstream.
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
  const openStack: Array<{ rowIndex: number; depth: number }> = [];

  const maybeAppendPlaceholder = (rowIndex: number) => {
    const count = childCounts[rowIndex];
    if (!count) return;
    const parentRow = rows[rowIndex];
    result.push({
      span: parentRow.span,
      isDetail: false,
      spanIndex: parentRow.spanIndex,
      isPrunedPlaceholder: true,
      prunedChildrenCount: count,
      prunedErrorCount: errorCounts[rowIndex] || 0,
    });
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.isDetail) {
      while (openStack.length && openStack[openStack.length - 1].depth >= row.span.depth) {
        maybeAppendPlaceholder(openStack.pop()!.rowIndex);
      }
    }
    result.push(row);
    if (!row.isDetail) {
      openStack.push({ rowIndex: i, depth: row.span.depth });
    }
  }
  while (openStack.length) {
    maybeAppendPlaceholder(openStack.pop()!.rowIndex);
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
