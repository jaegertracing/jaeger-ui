// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, SpanKind, StatusCode } from '../../../types/otel';
import colorGenerator from '../../../utils/color-generator';

/**
 * Describes one ancestor level rendered as an indent-guide stripe.
 * Shared across all siblings at the same depth (allocated once per parent).
 */
export type SpanTreeOffsetAncestor = {
  spanID: string;
  color: string;
  isTerminated: boolean;
};

export type SpanTreeOffsetState = {
  ancestors: SpanTreeOffsetAncestor[];
  isLastChild: boolean;
  // parentColor is intentionally omitted — consumers derive it as
  // `ancestors.at(-1)?.color ?? ownColor`, eliminating one source of
  // caller/callee inconsistency.
};

export type ViewedBoundsFunctionType = (start: number, end: number) => { start: number; end: number };
/**
 * Given a range (`min`, `max`) and factoring in a zoom (`viewStart`, `viewEnd`)
 * a function is created that will find the position of a sub-range (`start`, `end`).
 * The calling the generated method will return the result as a `{ start, end }`
 * object with values ranging in [0, 1].
 *
 * @param  {number} min       The start of the outer range.
 * @param  {number} max       The end of the outer range.
 * @param  {number} viewStart The start of the zoom, on a range of [0, 1],
 *                            relative to the `min`, `max`.
 * @param  {number} viewEnd   The end of the zoom, on a range of [0, 1],
 *                            relative to the `min`, `max`.
 * @returns {(number, number) => Object} Created view bounds function
 */
export function createViewedBoundsFunc(viewRange: {
  min: number;
  max: number;
  viewStart: number;
  viewEnd: number;
}) {
  const { min, max, viewStart, viewEnd } = viewRange;
  const duration = max - min;
  const viewMin = min + viewStart * duration;
  const viewMax = max - (1 - viewEnd) * duration;
  const viewWindow = viewMax - viewMin;

  /**
   * View bounds function
   * @param  {number} start     The start of the sub-range.
   * @param  {number} end       The end of the sub-range.
   * @return {Object}           The resultant range.
   */
  return (start: number, end: number) => ({
    start: (start - viewMin) / viewWindow,
    end: (end - viewMin) / viewWindow,
  });
}

/**
 * Returns `true` if the span has an error status.
 *
 * @param  {IOtelSpan} span  The OTEL span to check.
 * @return {boolean}         True if the span has an error status.
 */
export function isErrorSpan(span: IOtelSpan): boolean {
  return span.status.code === StatusCode.ERROR;
}

/**
 * Returns `true` if at least one of the descendants of the `parentSpanIndex`
 * span contains an error status.
 *
 * @param      {IOtelSpan[]}  spans            The OTEL spans for a trace - should be
 *                                             sorted with children following parents.
 * @param      {number}       parentSpanIndex  The index of the parent span - only
 *                                             subsequent spans with depth less than
 *                                             the parent span will be checked.
 * @return     {boolean}      Returns `true` if a descendant contains an error status.
 */
export function spanContainsErredSpan(spans: ReadonlyArray<IOtelSpan>, parentSpanIndex: number): boolean {
  const { depth } = spans[parentSpanIndex];
  let i = parentSpanIndex + 1;
  for (; i < spans.length && spans[i].depth > depth; i++) {
    if (isErrorSpan(spans[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Expects the first span to be the parent span.
 * Returns the first direct child span that is a SERVER span.
 */
export function findServerChildSpan(spans: ReadonlyArray<IOtelSpan>): IOtelSpan | null | false {
  if (spans.length <= 1 || spans[0].kind !== SpanKind.CLIENT) {
    return false;
  }
  const span = spans[0];
  const spanChildDepth = span.depth + 1;
  let i = 1;
  while (i < spans.length && spans[i].depth === spanChildDepth) {
    if (spans[i].kind === SpanKind.SERVER) {
      return spans[i];
    }
    i++;
  }
  return null;
}

export const isKindClient = (span: IOtelSpan): boolean => span.kind === SpanKind.CLIENT;

export const isKindProducer = (span: IOtelSpan): boolean => span.kind === SpanKind.PRODUCER;
/**
 * Build the tree-offset state for every span in a single O(n) DFS pass.
 *
 * Spans must be in pre-order DFS order (parent before children, siblings
 * sorted by startTime) — the same order guaranteed by trace normalization and
 * relied on by generateRowStates.ts.
 *
 * Key optimisation (from code-review feedback): all siblings at the same depth
 * share one `ancestors` array (allocated once per parent during the DFS).
 * The only per-span variation is `isLastChild` (one bool). This keeps the
 * total allocation O(max_depth) rather than O(n · depth).
 *
 * Mutable-snapshot invariant: `cachedAncestors[d]` is always rebuilt from the
 * live stack when we enter the *first child* of a new subtree (i.e. when the
 * cache entry is `undefined`). Mutations to live stack entries (isTerminated)
 * happen *before* the next snapshot is taken, so every snapshot reflects the
 * correct DFS state at that point.
 *
 * @param spans - Pre-order DFS array of spans from a normalised trace.
 * @returns Map from spanID → SpanTreeOffsetState, looked up O(1) per row.
 */
export function buildTreeOffsetMap(spans: ReadonlyArray<IOtelSpan>): Map<string, SpanTreeOffsetState> {
  const result = new Map<string, SpanTreeOffsetState>();

  // stack[d] holds the ancestor entry for depth d that is currently open.
  const stack: SpanTreeOffsetAncestor[] = [];

  // cachedAncestors[d] is the shared ancestors array for all children of the
  // span currently open at depth d-1. It is invalidated whenever we move to
  // a new subtree so the next first-child gets a fresh live snapshot.
  const cachedAncestors: (SpanTreeOffsetAncestor[] | undefined)[] = [];

  for (const span of spans) {
    const { depth } = span;

    // Pop entries that are deeper than the current span's depth.
    // Only invalidate cached ancestors for depths that are deeper than where
    // we are landing — siblings at the same depth share the same snapshot.
    while (stack.length > depth) {
      stack.pop();
      // Invalidate the cache for depths strictly above the current span's
      // depth so descendent-level caches get rebuilt for the new subtree.
      if (stack.length > depth) {
        cachedAncestors[stack.length] = undefined;
      }
    }

    // Determine whether this span is the last child of its parent.
    const parentEntry = depth > 0 ? stack[depth - 1] : null;
    const parentSpan = span.parentSpan;
    const isLastChild = parentSpan
      ? parentSpan.childSpans[parentSpan.childSpans.length - 1]?.spanID === span.spanID
      : false;

    // Build (or reuse) the shared ancestors array for this span.
    // All children of the same parent share the same prefix — we only
    // need to snapshot the stack once per parent, not once per child.
    if (cachedAncestors[depth] === undefined) {
      // Snapshot the live stack as the ancestors array for spans at this depth.
      // We must use the live stack values (not a previously cached prefix) because
      // ancestor.isTerminated is mutated as later siblings are processed.  A
      // cached prefix from when the first sibling was built would carry stale
      // isTerminated values for grandparent entries, causing descendants of the
      // last sibling to incorrectly show grandparent guide-bars as continuing.
      cachedAncestors[depth] = stack.map(entry => ({
        spanID: entry.spanID,
        color: entry.color,
        isTerminated: entry.isTerminated,
      }));
    }
    const ancestors = cachedAncestors[depth]!;

    result.set(span.spanID, { ancestors, isLastChild });

    // Push this span onto the stack so it becomes an ancestor for its children.
    // isTerminated here reflects whether *this* span is the last child of its
    // parent (the vertical bar drawn for this span terminates at this row).
    const selfEntry: SpanTreeOffsetAncestor = {
      spanID: span.spanID,
      color: colorGenerator.getColorByKey(span.resource.serviceName),
      isTerminated: isLastChild,
    };
    // Mutable-snapshot invariant: mutations to parentEntry.isTerminated happen
    // here, *after* this span's ancestors snapshot is taken but *before* the
    // next sibling enters the loop. When that sibling triggers a new snapshot
    // (cachedAncestors[depth] === undefined, because we invalidate on pop),
    // it sees the updated isTerminated value from the live stack. This is why
    // the snapshot must read from the live stack and not from a cached prefix.
    if (parentEntry !== null) {
      parentEntry.isTerminated = isLastChild;
    }
    stack.push(selfEntry);
    // Invalidate the cache for children of *this* span so they get a fresh
    // ancestors snapshot including this span as their immediate parent.
    cachedAncestors[depth + 1] = undefined;
  }

  return result;
}

export { formatDuration, formatDurationCompact } from '../../../utils/date';
