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
    // Add current span to new map
    const filteredChildren: Span[] = [];
    
    // Process children, skipping FOLLOWS_FROM
    span.childSpans.forEach(child => {
      const childRef = child.references.find(ref => ref.spanID === span.spanID);
      if (childRef?.refType !== 'FOLLOWS_FROM') {
        filteredChildren.push(child);
        walkTree(child);
      }
    });
    
    // Add span with filtered children
    newSpanMap.set(span.spanID, { ...span, childSpans: filteredChildren });
  };
  
  // Start from each root span
  rootSpans.forEach(rootSpan => {
    walkTree(rootSpan);
  });

  return newSpanMap;
};
export default getChildOfSpans;
