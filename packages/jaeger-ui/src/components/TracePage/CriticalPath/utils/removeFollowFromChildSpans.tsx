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

// This function removes child spans whose refType is FOLLOWS_FROM
const removeFollowFromChildSpans = (spans: Span[]): Span[] => {
  let refinedSpanData: Span[] = [];
  const droppedSpans: String[] = [];
  spans.forEach(span => {
    if (span.references[0]?.refType !== 'FOLLOWS_FROM') {
      refinedSpanData.push(span);
    } else {
      droppedSpans.push(span.spanID);
      // Remove dropped spanId from its parent chilsSpanIds array
      const parentSpan = spans.find(each => each.spanID === span.references[0].spanID)!;
      parentSpan.childSpanIds = parentSpan.childSpanIds.filter(a => a !== span.spanID);
    }
  });
  // Removing child spans of dropped spans
  refinedSpanData = refinedSpanData.filter(each => !droppedSpans.includes(each.references[0]?.spanID));
  return refinedSpanData;
};

export default removeFollowFromChildSpans;
