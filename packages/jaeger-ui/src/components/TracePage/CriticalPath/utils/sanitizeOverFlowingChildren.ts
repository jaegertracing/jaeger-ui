// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { CPSpan } from '../../../../model/critical_path';

/**
 * This function resolves overflowing child spans for each span.
 * An overflowing child span is one whose time range falls outside its parent span's time range.
 * The function adjusts the start time and duration of overflowing child spans
 * to ensure they fit within the time range of their parent span.
 * @param spanMap - A Map where span IDs are keys and the corresponding spans are values.
 * @returns - A sanitized span Map.
 */
const sanitizeOverFlowingChildren = (spanMap: Map<string, CPSpan>): Map<string, CPSpan> => {
  let spanIds: string[] = [...spanMap.keys()];

  spanIds.forEach(spanId => {
    const span = spanMap.get(spanId)!;
    if (!(span && span.references.length)) {
      return;
    }
    // parentSpan will be undefined when its parentSpan is dropped previously
    const parentSpan = spanMap.get(span.references[0].spanID);

    if (!parentSpan) {
      // Drop the child spans of dropped parent span
      spanMap.delete(span.spanID);
      return;
    }
    const childEndTime = span.startTime + span.duration;
    const parentEndTime = parentSpan.startTime + parentSpan.duration;
    if (span.startTime >= parentSpan.startTime) {
      if (span.startTime >= parentEndTime) {
        // child outside of parent range => drop the child span
        //      |----parent----|
        //                        |----child--|
        // Remove the childSpan from spanMap
        spanMap.delete(span.spanID);

        // Remove the childSpanId from its parent span
        parentSpan.childSpanIDs = parentSpan.childSpanIDs.filter(id => id !== span.spanID);
        return;
      }
      if (childEndTime > parentEndTime) {
        // child end after parent, truncate is needed
        //      |----parent----|
        //              |----child--|
        spanMap.set(span.spanID, {
          ...span,
          duration: parentEndTime - span.startTime,
        });
        return;
      }
      // everything looks good
      // |----parent----|
      //   |----child--|
      return;
    }
    if (childEndTime <= parentSpan.startTime) {
      // child outside of parent range => drop the child span
      //                      |----parent----|
      //       |----child--|

      // Remove the childSpan from spanMap
      spanMap.delete(span.spanID);

      // Remove the childSpanId from its parent span
      parentSpan.childSpanIDs = parentSpan.childSpanIDs.filter(id => id !== span.spanID);
    } else if (childEndTime <= parentEndTime) {
      // child start before parent, truncate is needed
      //      |----parent----|
      //   |----child--|
      spanMap.set(span.spanID, {
        ...span,
        startTime: parentSpan.startTime,
        duration: childEndTime - parentSpan.startTime,
      });
    } else {
      // child start before parent and end after parent, truncate is needed
      //      |----parent----|
      //  |---------child---------|
      spanMap.set(span.spanID, {
        ...span,
        startTime: parentSpan.startTime,
        duration: parentEndTime - parentSpan.startTime,
      });
    }
  });

  // Updated spanIds to ensure to not include dropped spans
  spanIds = [...spanMap.keys()];
  // Update Child Span References with updated parent span
  spanIds.forEach(spanId => {
    const span = spanMap.get(spanId)!;
    if (span.references.length) {
      const parentSpan = spanMap.get(span.references[0].spanID);
      span.references[0].span = parentSpan;
      spanMap.set(spanId, { ...span });
    }
  });

  return spanMap;
};
export default sanitizeOverFlowingChildren;
