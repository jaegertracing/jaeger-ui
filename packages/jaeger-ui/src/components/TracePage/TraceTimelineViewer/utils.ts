// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, SpanKind, StatusCode } from '../../../types/otel';
import { IViewRangeTime } from '../types';

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
 * @param      {Set<string>}  [skipIDs]        Descendants to leave out, such as the spans the
 *                                             filter hides in lift mode, whose errors the
 *                                             row reports as hidden errors.
 * @return     {boolean}      Returns `true` if a descendant contains an error status.
 */
export function spanContainsErredSpan(
  spans: ReadonlyArray<IOtelSpan>,
  parentSpanIndex: number,
  skipIDs?: ReadonlySet<string>
): boolean {
  const { depth } = spans[parentSpanIndex];
  let i = parentSpanIndex + 1;
  for (; i < spans.length && spans[i].depth > depth; i++) {
    if (isErrorSpan(spans[i]) && !skipIDs?.has(spans[i].spanID)) {
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
 * Map a normalized [0, 1] position within [viewStart, viewEnd] back to [0, 1] on the full trace.
 */
export function mapFromViewSubRange(viewStart: number, viewEnd: number, value: number): number {
  return viewStart + value * (viewEnd - viewStart);
}

/**
 * Map a normalized [0, 1] position on the full trace into [0, 1] within [viewStart, viewEnd].
 */
export function mapToViewSubRange(viewStart: number, viewEnd: number, value: number): number {
  return (value - viewStart) / (viewEnd - viewStart);
}

/**
 * Returns the CSS left percentage for the synchronized timeline cursor guide when visible,
 * or undefined when the cursor is unset, out of the zoomed range, invalid, or a drag is active.
 */
export function getViewCursorPosition(viewRangeTime: IViewRangeTime): string | undefined {
  const { current, cursor, reframe, shiftEnd, shiftStart } = viewRangeTime;
  const [viewStart, viewEnd] = current;
  const haveNextTimeRange = reframe != null || shiftEnd != null || shiftStart != null;
  if (
    haveNextTimeRange ||
    cursor == null ||
    !Number.isFinite(cursor) ||
    !Number.isFinite(viewStart) ||
    !Number.isFinite(viewEnd) ||
    viewEnd <= viewStart ||
    cursor < viewStart ||
    cursor > viewEnd
  ) {
    return undefined;
  }
  return `${mapToViewSubRange(viewStart, viewEnd, cursor) * 100}%`;
}

/**
 * Maps a pointer clientX coordinate inside the timeline container to a normalized full-trace
 * cursor position, or returns undefined if the pointer is outside the timeline bars column
 * or the container/range dimensions are invalid.
 */
export function getCursorForClientX(
  clientX: number,
  containerLeft: number,
  containerWidth: number,
  nameColumnWidth: number,
  viewRangeCurrent: [number, number]
): number | undefined {
  const [viewStart, viewEnd] = viewRangeCurrent;
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(containerLeft) ||
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(nameColumnWidth) ||
    !Number.isFinite(viewStart) ||
    !Number.isFinite(viewEnd) ||
    containerWidth <= 0 ||
    nameColumnWidth >= 1 ||
    viewEnd <= viewStart
  ) {
    return undefined;
  }
  const timelineLeft = containerLeft + containerWidth * nameColumnWidth;
  const timelineWidth = containerWidth * (1 - nameColumnWidth);
  if (timelineWidth <= 0 || clientX < timelineLeft || clientX > containerLeft + containerWidth) {
    return undefined;
  }
  const fraction = Math.min(1, Math.max(0, (clientX - timelineLeft) / timelineWidth));
  return mapFromViewSubRange(viewStart, viewEnd, fraction);
}

export { formatDuration, formatDurationCompact } from '../../../utils/date';
