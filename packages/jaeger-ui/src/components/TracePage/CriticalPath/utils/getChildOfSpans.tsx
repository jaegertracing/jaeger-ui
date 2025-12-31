// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { Span } from '../../../../types/trace';
/**
 * Removes child spans whose refType is FOLLOWS_FROM and their descendants.
 * Creates a new map without modifying the original.
 * @param spanMap - The map containing spans.
 * @returns - A map with spans whose refType is CHILD_OF.
 */
const getChildOfSpans = (spanMap: Map<string, Span>): Map<string, Span> => {
  const followFromSpanIds: string[] = [];
  const followFromSpansDescendantIds: string[] = [];
  const newSpanMap = new Map<string, Span>();

  // First find all FOLLOWS_FROM refType spans
  spanMap.forEach(each => {
    if (each.references[0]?.refType === 'FOLLOWS_FROM') {
      followFromSpanIds.push(each.spanID);
    }
  });

  // Recursively find all descendants of FOLLOWS_FROM spans
  const findDescendantSpans = (spans: Span[]) => {
    spans.forEach(span => {
      if (span.hasChildren && span.childSpans.length > 0) {
        span.childSpans.forEach(child => followFromSpansDescendantIds.push(child.spanID));
        findDescendantSpans(span.childSpans);
      }
    });
  };
  
  const followFromSpans = followFromSpanIds.map(id => spanMap.get(id)!).filter(s => s);
  findDescendantSpans(followFromSpans);
  
  // Build new map excluding FOLLOWS_FROM spans and their descendants
  const idsToBeExcluded = new Set([...followFromSpanIds, ...followFromSpansDescendantIds]);
  
  spanMap.forEach((span, spanId) => {
    if (!idsToBeExcluded.has(spanId)) {
      // Filter out FOLLOWS_FROM children from childSpans
      const filteredChildSpans = span.childSpans.filter(child => !idsToBeExcluded.has(child.spanID));
      newSpanMap.set(spanId, { ...span, childSpans: filteredChildSpans });
    }
  });

  return newSpanMap;
};
export default getChildOfSpans;
