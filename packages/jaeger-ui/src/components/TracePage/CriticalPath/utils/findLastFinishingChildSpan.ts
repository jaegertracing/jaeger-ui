// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { CPSpan } from '../../../../types/trace';

/**
 * @returns - Returns the span that finished last among the remaining child spans.
 * If a `returningChildStartTime` is provided as a parameter, it returns the child span that finishes
 * just before the specified `returningChildStartTime`.
 */
const findLastFinishingChildSpan = (
  spanMap: Map<string, CPSpan>,
  currentSpan: CPSpan,
  returningChildStartTime?: number
): CPSpan | undefined => {
  let lastFinishingChildSpan: CPSpan | undefined;
  let maxEndTime = -1;

  currentSpan.childSpanIds.forEach(childId => {
    const childSpan = spanMap.get(childId);
    if (!childSpan) return;

    const childEndTime = childSpan.startTime + childSpan.duration;

    if (returningChildStartTime) {
      if (childEndTime < returningChildStartTime) {
        if (childEndTime > maxEndTime) {
          maxEndTime = childEndTime;
          lastFinishingChildSpan = childSpan;
        }
      }
    } else {
      if (childEndTime > maxEndTime) {
        maxEndTime = childEndTime;
        lastFinishingChildSpan = childSpan;
      }
    }
  });

  return lastFinishingChildSpan;
};

export default findLastFinishingChildSpan;
