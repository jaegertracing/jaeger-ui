// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { Span } from '../../../../types/trace';

/**
 * This function resolves overflowing child spans for each span.
 * An overflowing child span is one whose time range falls outside its parent span's time range.
 * The function adjusts the start time and duration of overflowing child spans
 * to ensure they fit within the time range of their parent span.
 * Creates a new map without modifying the original.
 * @param spanMap - A Map where span IDs are keys and the corresponding spans are values.
 * @returns - A sanitized span Map.
 */
const sanitizeOverFlowingChildren = (spanMap: Map<string, Span>): Map<string, Span> => {
  const newSpanMap = new Map<string, Span>();
  const droppedSpanIds = new Set<string>();

  // First pass: identify spans to drop and create sanitized versions
  spanMap.forEach((span, spanId) => {
    if (!(span && span.references.length)) {
      newSpanMap.set(spanId, span);
      return;
    }

    // parentSpan will be undefined when its parentSpan is dropped previously
    const parentSpan = spanMap.get(span.references[0].spanID);

    if (!parentSpan || droppedSpanIds.has(span.references[0].spanID)) {
      // Drop the child spans of dropped parent span
      droppedSpanIds.add(span.spanID);
      return;
    }

    const childEndTime = span.startTime + span.duration;
    const parentEndTime = parentSpan.startTime + parentSpan.duration;

    if (span.startTime >= parentSpan.startTime) {
      if (span.startTime >= parentEndTime) {
        // child outside of parent range => drop the child span
        //      |----parent----|
        //                        |----child--|
        droppedSpanIds.add(span.spanID);
        return;
      }
      if (childEndTime > parentEndTime) {
        // child end after parent, truncate is needed
        //      |----parent----|
        //              |----child--|
        newSpanMap.set(span.spanID, {
          ...span,
          duration: parentEndTime - span.startTime,
        });
        return;
      }
      // everything looks good
      // |----parent----|
      //   |----child--|
      newSpanMap.set(spanId, span);
      return;
    }

    if (childEndTime <= parentSpan.startTime) {
      // child outside of parent range => drop the child span
      //                      |----parent----|
      //       |----child--|
      droppedSpanIds.add(span.spanID);
    } else if (childEndTime <= parentEndTime) {
      // child start before parent, truncate is needed
      //      |----parent----|
      //   |----child--|
      newSpanMap.set(span.spanID, {
        ...span,
        startTime: parentSpan.startTime,
        duration: childEndTime - parentSpan.startTime,
      });
    } else {
      // child start before parent and end after parent, truncate is needed
      //      |----parent----|
      //  |---------child---------|
      newSpanMap.set(span.spanID, {
        ...span,
        startTime: parentSpan.startTime,
        duration: parentEndTime - parentSpan.startTime,
      });
    }
  });

  // Second pass: update childSpans to reference sanitized versions and filter dropped spans
  const finalSpanMap = new Map<string, Span>();

  // First, create all spans with updated childSpans arrays (but still old child objects)
  newSpanMap.forEach((span, spanId) => {
    const filteredChildSpans = span.childSpans
      .filter(child => !droppedSpanIds.has(child.spanID))
      .map(child => {
        // Get the sanitized version from newSpanMap, or use original if not sanitized
        const sanitizedChild = newSpanMap.get(child.spanID);
        return sanitizedChild || child;
      });

    finalSpanMap.set(spanId, {
      ...span,
      childSpans: filteredChildSpans,
    });
  });

  // Third pass: update parent references in span.references to point to sanitized parents
  const result = new Map<string, Span>();
  finalSpanMap.forEach((span, spanId) => {
    let updatedReferences = span.references;
    if (span.references.length) {
      const parentSpanId = span.references[0].spanID;
      const parentSpan = finalSpanMap.get(parentSpanId);
      if (parentSpan) {
        updatedReferences = span.references.map(ref =>
          ref.spanID === parentSpanId ? { ...ref, span: parentSpan } : ref
        );
      }
    }

    result.set(spanId, {
      ...span,
      references: updatedReferences,
    });
  });

  return result;
};
export default sanitizeOverFlowingChildren;
