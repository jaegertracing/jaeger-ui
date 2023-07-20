// Copyright (c) 2023 Uber Technologies, Inc.
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

// This function turncates/drops the overflowing child spans
const sanitizeOverFlowingChildren = (spans: Span[]): Span[] => {
  const sanitizedSpanData: Span[] = [];
  const droppedSpans: Span[] = [];
  const refinedSantitizedSpanData: Span[] = [];

  spans.forEach(span => {
    if (!span.references.length) {
      sanitizedSpanData.push(span);
    } else {
      const parentSpan = span.references.filter(ref => ref.refType === 'CHILD_OF')[0].span!;
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

        default:
          // case 4: child outside of parent range => drop the child span
          //      |----parent----|
          //                        |----child--|
          // or
          //                      |----parent----|
          //       |----child--|
          droppedSpans.push({ ...span });
          // Remove the childSpanId from its parent span
          sanitizedSpanData.forEach(each => {
            if (each.spanID === span.references[0].spanID) {
              const index = each.childSpanIds.findIndex(id => id === span.spanID);
              each.childSpanIds.splice(index, 1);
            }
          });
          break;
      }
    }
  });
  // This make sure to also drop the all childs of dropped spans
  sanitizedSpanData.forEach(span => {
    if (span.references.length && span.references[0].refType === 'CHILD_OF') {
      const childOfDroppedSpan = droppedSpans.find(b => span.references[0].spanID === b.spanID);
      if (childOfDroppedSpan) {
        droppedSpans.push(span);
      } else {
        refinedSantitizedSpanData.push(span);
      }
    } else {
      refinedSantitizedSpanData.push(span);
    }
  });

  return refinedSantitizedSpanData;
};

export default sanitizeOverFlowingChildren;
