// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { Span } from '../../../../types/trace';
/**
 * Removes child spans whose refType is FOLLOWS_FROM and their descendants.
 * Creates a new map without modifying the original.
 * Walks the tree from rootSpans recursively to build the filtered map.
 * @param spanMap - The map containing spans.
 * @param rootSpans - The root spans of the trace.
 * @returns - A map with spans whose refType is CHILD_OF.
 */
const getChildOfSpans = (spanMap: Map<string, Span>, rootSpans: Span[]): Map<string, Span> => {
  const newSpanMap = new Map<string, Span>();

  // Recursively walk tree, skipping FOLLOWS_FROM children
  const walkTree = (span: Span) => {
    const filteredChildren: Span[] = [];

    // Process children, skipping those whose FIRST reference is FOLLOWS_FROM
    span.childSpans.forEach(child => {
      // Check if the child's first reference is FOLLOWS_FROM (matching original logic)
      if (child.references[0]?.refType !== 'FOLLOWS_FROM') {
        filteredChildren.push(child);
        walkTree(child);
      }
      // Note: FOLLOWS_FROM children and their descendants are skipped
    });

    // Add span with filtered children
    newSpanMap.set(span.spanID, { ...span, childSpans: filteredChildren });
  };

  // Start from each root span (spans without parents)
  // Root spans themselves should not have FOLLOWS_FROM as first reference since they have no parent
  rootSpans.forEach(rootSpan => {
    walkTree(rootSpan);
  });

  return newSpanMap;
};
export default getChildOfSpans;
