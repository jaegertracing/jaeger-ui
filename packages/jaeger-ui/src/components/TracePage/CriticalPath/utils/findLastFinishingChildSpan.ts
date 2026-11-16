// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { CPSpan } from '../../../../types/critical_path';

type RemainingChildren = {
  children: CPSpan[];
  next: number;
};

/**
 * @returns - Returns a function that returns the span that finished last among the remaining child spans.
 * If a `returningChildStartTime` is provided as a parameter, it returns the child span that finishes
 * just before the specified `returningChildStartTime`.
 * The children of each span are sorted by end time once. Repeated calls for the same span must pass
 * non-increasing `returningChildStartTime` values, as the critical path walk does. A returned child is
 * not returned again.
 */
const createLastFinishingChildFinder = (
  spanMap: Map<string, CPSpan>
): ((currentSpan: CPSpan, returningChildStartTime?: number) => CPSpan | undefined) => {
  const remainingBySpan = new Map<string, RemainingChildren>();

  return (currentSpan: CPSpan, returningChildStartTime?: number): CPSpan | undefined => {
    let remaining = remainingBySpan.get(currentSpan.spanID);
    if (!remaining) {
      const children: CPSpan[] = [];
      currentSpan.childSpanIDs.forEach(childId => {
        const childSpan = spanMap.get(childId);
        // A NaN or negative end time, e.g. from an uploaded span without a duration, is never picked.
        if (childSpan && childSpan.endTime >= 0) children.push(childSpan);
      });
      // A stable sort keeps the earlier child first when end times are equal.
      children.sort((a, b) => b.endTime - a.endTime);
      remaining = { children, next: 0 };
      remainingBySpan.set(currentSpan.spanID, remaining);
    }

    const { children } = remaining;
    if (returningChildStartTime) {
      while (
        remaining.next < children.length &&
        children[remaining.next].endTime >= returningChildStartTime
      ) {
        remaining.next++;
      }
    }

    const lastFinishingChildSpan = children[remaining.next];
    if (lastFinishingChildSpan) {
      remaining.next++;
    }
    return lastFinishingChildSpan;
  };
};

export default createLastFinishingChildFinder;
