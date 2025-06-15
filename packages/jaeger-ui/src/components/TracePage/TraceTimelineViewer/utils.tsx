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
export const isErrorSpan = (span: Span) => isErrorBool(span) || isErrorStr(span);

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
    if (isErrorSpan(spans[i])) {
      return true;
    }
  }
  return false;
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

/**
 * Configuration for sparse trace visualization
 */
export interface SparseTraceConfig {
  enabled: boolean;
  gapThresholdMultiplier: number; // Gap must be N times larger than surrounding span durations
  minGapDuration: number; // Minimum gap duration to consider for collapsing (in microseconds)
  maxCollapsedGapWidth: number; // Maximum width percentage for collapsed gap representation
}

export const DEFAULT_SPARSE_TRACE_CONFIG: SparseTraceConfig = {
  enabled: true,
  gapThresholdMultiplier: 3,
  minGapDuration: 1000000, // 1 second in microseconds
  maxCollapsedGapWidth: 0.02, // 2% of timeline width
};

/**
 * Represents a gap between span groups that can be collapsed
 */
export interface TimelineGap {
  startTime: number;
  endTime: number;
  duration: number;
  precedingSpanEndTime: number;
  followingSpanStartTime: number;
  shouldCollapse: boolean;
  collapsedWidth: number; // Width percentage when collapsed
}

/**
 * Represents a span group - a collection of spans with minimal gaps between them
 */
export interface SpanGroup {
  startTime: number;
  endTime: number;
  duration: number;
  spanIndices: number[];
}

/**
 * Analyzes trace spans to identify gaps that should be collapsed for sparse visualization
 */
export function analyzeTraceGaps(
  spans: Span[],
  traceStartTime: number,
  traceDuration: number,
  config: SparseTraceConfig = DEFAULT_SPARSE_TRACE_CONFIG
): TimelineGap[] {
  if (!config.enabled || !spans || spans.length === 0) {
    return [];
  }

  // Sort spans by start time to analyze gaps
  const sortedSpans = [...spans].sort((a, b) => a.startTime - b.startTime);
  const gaps: TimelineGap[] = [];

  for (let i = 0; i < sortedSpans.length - 1; i++) {
    const currentSpan = sortedSpans[i];
    const nextSpan = sortedSpans[i + 1];

    const currentSpanEndTime = currentSpan.startTime + currentSpan.duration;
    const gapStartTime = currentSpanEndTime;
    const gapEndTime = nextSpan.startTime;
    const gapDuration = gapEndTime - gapStartTime;

    // Only consider positive gaps
    if (gapDuration <= 0) {
      continue;
    }

    // Check if gap meets minimum duration threshold
    if (gapDuration < config.minGapDuration) {
      continue;
    }

    // Calculate surrounding span durations for threshold comparison
    const precedingDuration = currentSpan.duration;
    const followingDuration = nextSpan.duration;
    const surroundingDuration = Math.max(precedingDuration, followingDuration);

    // Check if gap is significantly larger than surrounding spans
    const shouldCollapse = gapDuration > surroundingDuration * config.gapThresholdMultiplier;

    // Calculate collapsed width (smaller of max allowed or proportional to original)
    const originalWidthPercent = gapDuration / traceDuration;
    const collapsedWidth = shouldCollapse
      ? Math.min(config.maxCollapsedGapWidth, originalWidthPercent * 0.1)
      : originalWidthPercent;

    gaps.push({
      startTime: gapStartTime,
      endTime: gapEndTime,
      duration: gapDuration,
      precedingSpanEndTime: currentSpanEndTime,
      followingSpanStartTime: nextSpan.startTime,
      shouldCollapse,
      collapsedWidth,
    });
  }

  return gaps;
}

/**
 * Creates a sparse-aware view bounds function that accounts for collapsed gaps
 */
export function createSparseViewedBoundsFunc(
  viewRange: {
    min: number;
    max: number;
    viewStart: number;
    viewEnd: number;
  },
  gaps: TimelineGap[]
): ViewedBoundsFunctionType {
  const { min, max, viewStart, viewEnd } = viewRange;
  const duration = max - min;

  // If no collapsible gaps, use standard function
  const collapsibleGaps = gaps.filter(gap => gap.shouldCollapse);
  if (collapsibleGaps.length === 0) {
    return createViewedBoundsFunc(viewRange);
  }

  // Calculate total time saved by collapsing gaps
  const totalCollapsedTime = collapsibleGaps.reduce((sum, gap) => {
    return sum + (gap.duration - gap.collapsedWidth * duration);
  }, 0);

  // Calculate the compressed timeline duration
  const compressedDuration = duration - totalCollapsedTime;
  const viewMin = min + viewStart * compressedDuration;
  const viewMax = max - (1 - viewEnd) * compressedDuration;
  const viewWindow = viewMax - viewMin;

  /**
   * Sparse view bounds function that maps original timestamps to compressed timeline positions
   */
  return (start: number, end: number) => {
    const compressedStart = mapToCompressedTimeline(start, min, collapsibleGaps, duration);
    const compressedEnd = mapToCompressedTimeline(end, min, collapsibleGaps, duration);

    return {
      start: (compressedStart - viewMin) / viewWindow,
      end: (compressedEnd - viewMin) / viewWindow,
    };
  };
}

/**
 * Maps a timestamp from the original timeline to the compressed timeline
 */
function mapToCompressedTimeline(
  timestamp: number,
  traceStartTime: number,
  collapsibleGaps: TimelineGap[],
  originalDuration: number
): number {
  let compressedTime = timestamp - traceStartTime;

  // Adjust for each collapsed gap that occurs before this timestamp
  for (const gap of collapsibleGaps) {
    if (timestamp > gap.endTime) {
      // Timestamp is after this gap, subtract the collapsed time
      const timeRemoved = gap.duration - (gap.collapsedWidth * originalDuration);
      compressedTime -= timeRemoved;
    } else if (timestamp >= gap.startTime && timestamp <= gap.endTime) {
      // Timestamp is within a collapsed gap, map it proportionally
      const gapProgress = (timestamp - gap.startTime) / gap.duration;
      const collapsedGapDuration = gap.collapsedWidth * originalDuration;
      compressedTime = gap.startTime - traceStartTime + (gapProgress * collapsedGapDuration);

      // Subtract time from previous gaps
      for (const prevGap of collapsibleGaps) {
        if (prevGap.endTime < gap.startTime) {
          const timeRemoved = prevGap.duration - (prevGap.collapsedWidth * originalDuration);
          compressedTime -= timeRemoved;
        }
      }
      break;
    }
  }

  return compressedTime + traceStartTime;
}
