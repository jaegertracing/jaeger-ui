// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { CPSpan } from '../../../../types/critical_path';
/**
 * Removes child spans whose refType is FOLLOWS_FROM and their descendants.
 * @param spanMap - The map containing spans.
 * @returns - A map with spans whose refType is CHILD_OF.
 */
const getChildOfSpans = (spanMap: Map<string, CPSpan>): Map<string, CPSpan> => {
  const followFromSpanIds: string[] = [];
  const followFromSpansDescendantIds: string[] = [];

  // First find all FOLLOWS_FROM refType spans
  spanMap.forEach(each => {
    if (each.references[0]?.refType === 'FOLLOWS_FROM') {
      followFromSpanIds.push(each.spanID);
      // Remove the spanId from childSpanIDs array of its parentSpan
      const parentSpan = spanMap.get(each.references[0].spanID)!;
      parentSpan.childSpanIDs = parentSpan.childSpanIDs.filter(a => a !== each.spanID);
      spanMap.set(parentSpan.spanID, { ...parentSpan });
    }
  });

  // Recursively find all Descendants of FOLLOWS_FROM spans
  const findDescendantSpans = (spanIds: ReadonlyArray<string>) => {
    spanIds.forEach(spanId => {
      const span = spanMap.get(spanId)!;
      if (span.childSpanIDs.length > 0) {
        followFromSpansDescendantIds.push(...span.childSpanIDs);
        findDescendantSpans(span.childSpanIDs);
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
