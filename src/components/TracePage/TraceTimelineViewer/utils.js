// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as d3 from 'd3-scale';
import _ from 'lodash';

/**
 * Will calculate the start and end percent of span,
 * given a trace startTime and endTime.
 * Will also factor in zoom.
 */
export function calculateSpanPosition(
  {
    traceStartTime,
    traceEndTime,
    spanStart,
    spanEnd,
    xStart = 0,
    xEnd = 100,
  }
) {
  const xValue = d3
    .scaleLinear()
    .domain([traceStartTime, traceEndTime])
    .range([0, 100]);
  const zoomValue = d3.scaleLinear().domain([xStart, xEnd]).range([0, 100]);
  return {
    xStart: zoomValue(xValue(spanStart)),
    xEnd: zoomValue(xValue(spanEnd)),
  };
}

/**
 * Given a percent and traceDuration, will give back
 * a relative time from 0.
 *
 * eg: 50% at 100ms = 50ms
 */
export function calculateTimeAtPositon(
  {
    position,
    traceDuration,
  }
) {
  const xValue = d3.scaleLinear().domain([0, 100]).range([0, traceDuration]);
  return xValue(position);
}

/**
 * Given a subset of the duration of two timestamps,
 * return the start and end time as a percent.
 *
 * for example if a span starts at 100ms and ends at 200ms:
 * 150ms, 200ms => 50,100
 * 100ms, 200ms => 0,100
 */
export function convertTimeRangeToPercent(
  [startTime, endTime],
  [traceStartTime, traceEndTime]
) {
  if (startTime === null || endTime === null) {
    return [0, 100];
  }
  const getPercent = d3
    .scaleLinear()
    .domain([traceStartTime, traceEndTime])
    .range([0, 100]);
  return [getPercent(startTime), getPercent(endTime)];
}

export function ensureWithinRange([floor = 0, ceiling = 100], num) {
  if (num < floor) {
    return floor;
  }
  if (num > ceiling) {
    return ceiling;
  }
  return num;
}

export function hasTagKey(tags, key, value) {
  if (!tags || !tags.length) {
    return false;
  }
  return _.some(tags, tag => tag.key === key && tag.value === value);
}

export const isClientSpan = span => hasTagKey(span.tags, 'span.kind', 'client');
export const isServerSpan = span => hasTagKey(span.tags, 'span.kind', 'server');
export const isErrorSpan = span => hasTagKey(span.tags, 'error', true);

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
export function spanContainsErredSpan(spans, parentSpanIndex) {
  const { depth } = spans[parentSpanIndex];
  let i = parentSpanIndex + 1;
  for (; spans[i].depth > depth; i++) {
    if (isErrorSpan(spans[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Expects the first span to be the parent span.
 */
export function findServerChildSpan(spans) {
  if (spans.length <= 1 || !isClientSpan(spans[0])) {
    return false;
  }
  const span = spans[0];
  const spanChildDepth = span.depth + 1;
  let serverSpan;
  let i = 1;
  while (i < spans.length && spans[i].depth === spanChildDepth && !serverSpan) {
    if (isServerSpan(spans[i])) {
      serverSpan = spans[i];
    }
    i++;
  }
  return serverSpan;
}

export { formatDuration } from '../../../utils/date';
