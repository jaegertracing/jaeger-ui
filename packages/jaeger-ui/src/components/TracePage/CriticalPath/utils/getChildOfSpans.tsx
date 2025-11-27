// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { Span } from '../../../../types/trace';
/**
 * Removes child spans whose refType is FOLLOWS_FROM and their descendants.
 * @param spanMap - The map containing spans.
 * @returns - A map with spans whose refType is CHILD_OF.
 */
const getChildOfSpans = (spanMap: Map<string, Span>): Map<string, Span> => {
  const followFromSpanIds: string[] = [];
  const followFromSpansDescendantIds: string[] = [];

  // First find all FOLLOWS_FROM refType spans
  spanMap.forEach(each => {
    if (each.references[0]?.refType === 'FOLLOWS_FROM') {
      followFromSpanIds.push(each.spanID);
      // Remove the spanId from childSpanIds array of its parentSpan
      const parentSpan = spanMap.get(each.references[0].spanID)!;
      parentSpan.childSpanIds = parentSpan.childSpanIds.filter(a => a !== each.spanID);
      spanMap.set(parentSpan.spanID, { ...parentSpan });
    }
  });

  // Recursively find all Descendants of FOLLOWS_FROM spans
  const findDescendantSpans = (spanIds: string[]) => {
    spanIds.forEach(spanId => {
      const span = spanMap.get(spanId)!;
      if (span.hasChildren) {
        followFromSpansDescendantIds.push(...span.childSpanIds);
        findDescendantSpans(span.childSpanIds);
      }
    });
  };
  findDescendantSpans(followFromSpanIds);
  // Delete all FOLLOWS_FROM spans and its descendants
  const idsToBeDeleted = [...followFromSpanIds, ...followFromSpansDescendantIds];
  idsToBeDeleted.forEach(id => spanMap.delete(id));

  return spanMap;
};
export default getChildOfSpans;
