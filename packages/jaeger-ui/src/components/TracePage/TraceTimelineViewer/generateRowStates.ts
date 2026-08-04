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

export const ROW_TYPE_SPAN = 0;
const ROW_TYPE_DETAIL = 1;
export const ROW_TYPE_PRUNED = 2;

/**
 * RowStatesView implements a Structure of Arrays (SoA) layout for trace timeline rows.
 * Instead of allocating N RowState objects upfront, we maintain parallel typed-array-like
 * structures for indices, types, and pruned statistics. Objects are only materialized
 * via getRow() on-demand for the visible viewport, significantly reducing GC churn on large traces.
 *
 * Note: spanObjIndices exists separately from spanIndices because pruned placeholders
 * need to track their maxSpanIndex for timeline placement (stored in spanIndices), while
 * referencing their parent span for the actual IOtelSpan object reference (stored in spanObjIndices).
 */
export class RowStatesView {
  private spans: ReadonlyArray<IOtelSpan>;

  public spanIndices: number[] = [];
  public rowTypes: number[] = [];

  // For pruned placeholders we keep a reference to the *parent* span object.
  // `spanObjIndices` stores that parent's index in the original `spans` array,
  // while `spanIndices` stores the *max* span index used for timeline placement.
  private spanObjIndices: number[] = [];

  // Statistics for pruned placeholders - how many child spans and error spans were collapsed.
  private prunedChildCounts: number[] = [];
  private prunedErrorCounts: number[] = [];

  constructor(spans: ReadonlyArray<IOtelSpan>) {
    this.spans = spans;
  }

  get length() {
    return this.spanIndices.length;
  }

  pushSpan(spanIndex: number) {
    this.spanIndices.push(spanIndex);
    this.spanObjIndices.push(spanIndex);
    this.rowTypes.push(ROW_TYPE_SPAN);
    this.prunedChildCounts.push(0);
    this.prunedErrorCounts.push(0);
  }

  pushDetail(spanIndex: number) {
    this.spanIndices.push(spanIndex);
    this.spanObjIndices.push(spanIndex);
    this.rowTypes.push(ROW_TYPE_DETAIL);
    this.prunedChildCounts.push(0);
    this.prunedErrorCounts.push(0);
  }

  pushPruned(parentSpanIndex: number, maxSpanIndex: number, childCount: number, errorCount: number) {
    // maxSpanIndex determines the timeline position of the placeholder;
    // parentSpanIndex points to the actual span object that owns the pruned subtree.
    this.spanIndices.push(maxSpanIndex);
    this.spanObjIndices.push(parentSpanIndex);
    this.rowTypes.push(ROW_TYPE_PRUNED);
    this.prunedChildCounts.push(childCount);
    this.prunedErrorCounts.push(errorCount);
  }

  getRow(index: number): RowState {
    const spanIndex = this.spanIndices[index];
    // For pruned placeholders, objIndex refers to the parent span (who owns the collapsed children),
    // while spanIndex holds the max child index for timeline position.
    const objIndex = this.spanObjIndices[index];
    const type = this.rowTypes[index];
    const span = this.spans[objIndex];

    if (type === ROW_TYPE_SPAN) {
      return { isDetail: false, span, spanIndex };
    }
    if (type === ROW_TYPE_DETAIL) {
      return { isDetail: true, span, spanIndex };
    }
    return {
      isDetail: false,
      span,
      spanIndex,
      isPrunedPlaceholder: true,
      prunedChildrenCount: this.prunedChildCounts[index],
      prunedErrorCount: this.prunedErrorCounts[index],
    };
  }

  findIndexByKey(spanID: string, type: string): number {
    const len = this.length;
    for (let i = 0; i < len; i++) {
      const objIndex = this.spanObjIndices[i];
      if (this.spans[objIndex].spanID === spanID) {
        const rowType = this.rowTypes[i];
        if (type === 'pruned' && rowType === ROW_TYPE_PRUNED) return i;
        if (type === 'detail' && rowType === ROW_TYPE_DETAIL) return i;
        if (type === 'bar' && rowType === ROW_TYPE_SPAN) return i;
      }
    }
    return -1;
  }
}

type PrunedStats = {
  childCounts: number[];
  errorCounts: number[];
};

function buildVisibleRows(
  spans: ReadonlyArray<IOtelSpan>,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>,
  detailPanelMode: 'inline' | 'sidepanel',
  prunedServices: Set<string>
): { view: RowStatesView; prunedStats: PrunedStats | null } {
  const hasPruning = prunedServices.size > 0;
  let collapseDepth: number | null = null;
  const view = new RowStatesView(spans);

  const parentByDepth: (number | undefined)[] = [];
  const childCounts: number[] = [];
  const errorCounts: number[] = [];

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const { spanID, depth } = span;

    if (collapseDepth != null) {
      if (depth >= collapseDepth) {
        continue;
      }
      collapseDepth = null;
    }

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

    if (childrenHiddenIDs.has(spanID)) {
      collapseDepth = depth + 1;
    }

    parentByDepth[depth] = view.length;
    view.pushSpan(i);

    if (detailPanelMode !== 'sidepanel' && detailStates.has(spanID)) {
      view.pushDetail(i);
    }
  }

  return {
    view,
    prunedStats: hasPruning ? { childCounts, errorCounts } : null,
  };
}

function insertPrunedPlaceholders(
  spans: ReadonlyArray<IOtelSpan>,
  sourceView: RowStatesView,
  stats: PrunedStats
): RowStatesView {
  const { childCounts, errorCounts } = stats;
  const result = new RowStatesView(spans);
  const openStack: Array<{ rowIndex: number; depth: number; maxSpanIndex: number }> = [];

  const maybeAppendPlaceholder = (entry: { rowIndex: number; maxSpanIndex: number }) => {
    const count = childCounts[entry.rowIndex];
    if (!count) return;

    const parentSpanIndex = sourceView.spanIndices[entry.rowIndex];
    result.pushPruned(parentSpanIndex, entry.maxSpanIndex, count, errorCounts[entry.rowIndex] || 0);
  };

  const len = sourceView.length;
  for (let i = 0; i < len; i++) {
    const isDetail = sourceView.rowTypes[i] === ROW_TYPE_DETAIL;
    const spanIndex = sourceView.spanIndices[i];
    const depth = spans[spanIndex].depth;

    if (!isDetail) {
      while (openStack.length && openStack[openStack.length - 1].depth >= depth) {
        const closed = openStack.pop()!;
        maybeAppendPlaceholder(closed);
        if (openStack.length) {
          const parent = openStack[openStack.length - 1];
          parent.maxSpanIndex = Math.max(parent.maxSpanIndex, closed.maxSpanIndex);
        }
      }
    }

    if (isDetail) {
      result.pushDetail(spanIndex);
    } else {
      result.pushSpan(spanIndex);
    }

    if (!isDetail) {
      if (openStack.length) {
        const top = openStack[openStack.length - 1];
        top.maxSpanIndex = Math.max(top.maxSpanIndex, spanIndex);
      }
      openStack.push({ rowIndex: i, depth, maxSpanIndex: spanIndex });
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

export default function generateRowStates(
  spans: ReadonlyArray<IOtelSpan> | TNil,
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, DetailState | TNil>,
  detailPanelMode: 'inline' | 'sidepanel',
  prunedServices: Set<string>
): RowStatesView {
  if (!spans) {
    return new RowStatesView([]);
  }
  const { view, prunedStats } = buildVisibleRows(
    spans,
    childrenHiddenIDs,
    detailStates,
    detailPanelMode,
    prunedServices
  );
  return prunedStats ? insertPrunedPlaceholders(spans, view, prunedStats) : view;
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
