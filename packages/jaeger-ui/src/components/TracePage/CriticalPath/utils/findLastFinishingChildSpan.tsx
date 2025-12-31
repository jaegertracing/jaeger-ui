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
  let lastFinishingChildSpan: Span | undefined;
  let latestEndTime = -1;

  // Iterate through children directly from childSpans array
  for (const childSpan of currentSpan.childSpans) {
    const childEndTime = childSpan.startTime + childSpan.duration;

    if (returningChildStartTime) {
      // Find child that finishes just before returningChildStartTime
      if (childEndTime < returningChildStartTime && childEndTime > latestEndTime) {
        latestEndTime = childEndTime;
        lastFinishingChildSpan = childSpan;
      }
    } else {
      // Find child that finishes last overall
      if (childEndTime > latestEndTime) {
        latestEndTime = childEndTime;
        lastFinishingChildSpan = childSpan;
      }
    }
  }

  return lastFinishingChildSpan;
};

export default findLastFinishingChildSpan;
