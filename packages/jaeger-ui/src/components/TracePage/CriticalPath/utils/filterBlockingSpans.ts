// Copyright (c) 2026 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { CPSpan } from '../../../../types/critical_path';

/**
 * Removes non-blocking child spans and their descendants from the span map.
 * Non-blocking spans (i.e. children in PRODUCER/CONSUMER relationship) run
 * independently and do not affect their parent's critical path.
 *
 * @param spanMap - The map containing spans.
 * @returns A map with only blocking spans remaining.
 */
function filterBlockingSpans(spanMap: Map<string, CPSpan>): Map<string, CPSpan> {
  const nonBlockingSpanIds: string[] = [];
  const descendantIds: string[] = [];

  // First find all non-blocking spans
  spanMap.forEach(span => {
    // We only filter out non-blocking spans that have a parent.
    // The root span (no parentSpanID) is always kept to provide a starting point for the algorithm.
    if (!span.isBlocking && span.parentSpanID) {
      nonBlockingSpanIds.push(span.spanID);
      // Remove the spanID from childSpanIDs array of its parent span
      const parentSpan = spanMap.get(span.parentSpanID);
      if (parentSpan) {
        parentSpan.childSpanIDs = parentSpan.childSpanIDs.filter(id => id !== span.spanID);
      }
    }
  });

  // Recursively find all descendants of non-blocking spans
  const findDescendantSpans = (spanIds: ReadonlyArray<string>) => {
    spanIds.forEach(spanId => {
      const span = spanMap.get(spanId);
      if (span && span.childSpanIDs.length > 0) {
        descendantIds.push(...span.childSpanIDs);
        findDescendantSpans(span.childSpanIDs);
      }
    });
  };
  findDescendantSpans(nonBlockingSpanIds);

  // Delete all non-blocking spans and their descendants
  nonBlockingSpanIds.forEach(id => spanMap.delete(id));
  descendantIds.forEach(id => spanMap.delete(id));

  return spanMap;
}

export default filterBlockingSpans;
