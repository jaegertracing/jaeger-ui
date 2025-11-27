// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { Span } from '../../../../types/trace';

/**
 * @returns - Returns the span that finished last among the remaining child spans.
 * If a `returningChildStartTime` is provided as a parameter, it returns the child span that finishes
 * just before the specified `returningChildStartTime`.
 */
const findLastFinishingChildSpan = (
  spanMap: Map<string, Span>,
  currentSpan: Span,
  returningChildStartTime?: number
): Span | undefined => {
  let lastFinishingChildSpanId: string | undefined;
  if (returningChildStartTime) {
    lastFinishingChildSpanId = currentSpan.childSpanIds.find(
      each =>
        // Look up the span using the map
        spanMap.has(each) &&
        spanMap.get(each)!.startTime + spanMap.get(each)!.duration < returningChildStartTime
    );
  } else {
    // If `returningChildStartTime` is not provided, select the first child span.
    // As they are sorted based on endTime
    lastFinishingChildSpanId = currentSpan.childSpanIds[0];
  }
  return lastFinishingChildSpanId ? spanMap.get(lastFinishingChildSpanId) : undefined;
};

export default findLastFinishingChildSpan;
