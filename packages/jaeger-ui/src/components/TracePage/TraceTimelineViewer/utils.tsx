// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Span } from '../../../types/trace';

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
 * Returns `true` if the `span` has a tag matching `key` = `value`.
 *
 * @param  {string} key   The tag key to match on.
 * @param  {any}    value The tag value to match.
 * @param  {{tags}} span  An object with a `tags` property of { key, value }
 *                        items.
 * @return {boolean}      True if a match was found.
 */
export function spanHasTag(key: string, value: string | boolean, span: Span) {
  if (!Array.isArray(span.tags) || !span.tags.length) {
    return false;
  }
  return span.tags.some(tag => tag.key === key && tag.value === value);
}

export const isClientSpan = spanHasTag.bind(null, 'span.kind', 'client');
export const isServerSpan = spanHasTag.bind(null, 'span.kind', 'server');

const isErrorBool = spanHasTag.bind(null, 'error', true);
const isErrorStr = spanHasTag.bind(null, 'error', 'true');

export interface IErrorSpanInfo {
  isError: boolean; // true if this span OR its descendants have errors
  selfError: boolean; // true if only this span has errors
}

export const isErrorSpan = (span: Span): IErrorSpanInfo => {
  const selfError = isErrorBool(span) || isErrorStr(span);
  return {
    isError: selfError, // For now, same as selfError - will be enhanced when context is available
    selfError,
  };
};

/**
 * Enhanced version of isErrorSpan that can determine if a span has errors including descendants.
 * This requires the full spans array and span index for context.
 */
export const isErrorSpanWithContext = (spans: Span[], spanIndex: number): IErrorSpanInfo => {
  const span = spans[spanIndex];
  const selfError = isErrorBool(span) || isErrorStr(span);

  // Check if any descendants have errors using the existing logic
  const hasErrorDescendants = getDescendantErroredSpanIDs(spans, spanIndex).length > 0;

  return {
    isError: selfError || hasErrorDescendants,
    selfError,
  };
};

/**
 * Returns `true` if at least one of the descendants of the `parentSpanIndex`
 * span contains an error tag.
 *
 * @param      {Span[]}   spans            The spans for a trace - should be
 *                                         sorted with children following parents.
 * @param      {number}   parentSpanIndex  The index of the parent span - only
 *                                         subsequent spans with depth less than
 *                                         the parent span will be checked.
 * @return     {boolean}  Returns `true` if a descendant contains an error tag.
 */
export function spanContainsErredSpan(spans: Span[], parentSpanIndex: number) {
  const { depth } = spans[parentSpanIndex];
  let i = parentSpanIndex + 1;
  for (; i < spans.length && spans[i].depth > depth; i++) {
    if (isErrorSpan(spans[i]).selfError) {
      return true;
    }
  }
  return false;
}

/**
 * Collect the spanIDs of all descendant spans that contain an error tag.
 * Descendants are spans after parentSpanIndex with strictly greater depth
 * until depth drops back to parent's depth or less.
 */
export function getDescendantErroredSpanIDs(spans: Span[], parentSpanIndex: number): string[] {
  const erroredIds: string[] = [];
  if (!spans || !Array.isArray(spans) || parentSpanIndex < 0 || parentSpanIndex >= spans.length) {
    return erroredIds;
  }
  const { depth } = spans[parentSpanIndex];
  let i = parentSpanIndex + 1;
  for (; i < spans.length && spans[i].depth > depth; i++) {
    if (isErrorSpan(spans[i]).selfError) {
      erroredIds.push(spans[i].spanID);
    }
  }
  return erroredIds;
}

/**
 * Expects the first span to be the parent span.
 */
export function findServerChildSpan(spans: Span[]) {
  if (spans.length <= 1 || !isClientSpan(spans[0])) {
    return false;
  }
  const span = spans[0];
  const spanChildDepth = span.depth + 1;
  let i = 1;
  while (i < spans.length && spans[i].depth === spanChildDepth) {
    if (isServerSpan(spans[i])) {
      return spans[i];
    }
    i++;
  }
  return null;
}

export const isKindClient = (span: Span): boolean =>
  span.tags.some(({ key, value }) => key === 'span.kind' && value === 'client');

export const isKindProducer = (span: Span): boolean =>
  span.tags.some(({ key, value }) => key === 'span.kind' && value === 'producer');

export { formatDuration } from '../../../utils/date';
