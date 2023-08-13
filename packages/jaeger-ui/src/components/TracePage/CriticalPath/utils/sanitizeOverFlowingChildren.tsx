// Copyright (c) 2023 The Jaeger Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Span } from '../../../../types/trace';

// This function truncates/drops the overflowing child spans
const sanitizeOverFlowingChildren = (spans: Span[]): Span[] => {
  let sanitizedSpanData: Span[] = [];

  spans.forEach(span => {
    if (!span.references.length) {
      sanitizedSpanData.push(span);
    } else {
      // parentSpan will be undefined when its parentSpan is dropped previously
      const parentSpan = sanitizedSpanData.find(s => s.spanID === span.references[0].spanID)!;
      if (parentSpan) {
        const childEndTime = span.startTime + span.duration;
        const parentEndTime = parentSpan.startTime + parentSpan.duration;
        switch (true) {
          case span.startTime >= parentSpan.startTime && childEndTime <= parentEndTime:
            // case 1: everything looks good
            // |----parent----|
            //   |----child--|
            sanitizedSpanData.push(span);
            break;

          case span.startTime < parentSpan.startTime &&
            childEndTime <= parentEndTime &&
            childEndTime > parentSpan.startTime:
            // case 2: child start before parent, truncate is needed
            //      |----parent----|
            //   |----child--|
            sanitizedSpanData.push({
              ...span,
              startTime: parentSpan.startTime,
              duration: childEndTime - parentSpan.startTime,
            });
            break;

          case span.startTime >= parentSpan.startTime &&
            childEndTime > parentEndTime &&
            span.startTime < parentEndTime:
            // case 3: child end after parent, truncate is needed
            //      |----parent----|
            //              |----child--|
            sanitizedSpanData.push({
              ...span,
              duration: parentEndTime - span.startTime,
            });
            break;

          case span.startTime >= parentEndTime || childEndTime <= parentSpan.startTime:
            // case 4: child outside of parent range => drop the child span
            //      |----parent----|
            //                        |----child--|
            // or
            //                      |----parent----|
            //       |----child--|

            // Remove the childSpanId from its parent span
            sanitizedSpanData.forEach(each => {
              if (each.spanID === span.references[0].spanID) {
                const index = each.childSpanIds.findIndex(id => id === span.spanID);
                each.childSpanIds.splice(index, 1);
              }
            });
            break;

          default:
            // Never reaches to default
            // Something unexpected happened
            throw RangeError(`Error while computing Critical Path Algorithm.`);
        }
      }
    }
  });
  // Update Child Span References
  sanitizedSpanData = sanitizedSpanData.map(each => {
    const spanCopy = { ...each };
    if (each.references.length) {
      const parentSpan = sanitizedSpanData.find(span => span.spanID === each.references[0].spanID);
      spanCopy.references[0].span = parentSpan;
    }
    return spanCopy;
  });

  return sanitizedSpanData;
};
export default sanitizeOverFlowingChildren;
