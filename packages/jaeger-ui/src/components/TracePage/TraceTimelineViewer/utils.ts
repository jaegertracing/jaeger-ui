// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, SpanKind, StatusCode } from '../../../types/otel';

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

export { formatDuration } from '../../../utils/date';
