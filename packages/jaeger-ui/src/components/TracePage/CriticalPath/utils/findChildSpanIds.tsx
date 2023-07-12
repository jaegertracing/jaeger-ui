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

// This function finds child spans for each span and also sorts childSpanIds based on endTime
const findChildSpanIds = (spans: Span[]): Span[] => {
  const refinedSpanData: Span[] = [];
  spans.forEach(span => {
    if (span.hasChildren) {
      const Children = spans
        .filter(span2 =>
          span2.references.some(
            reference => reference.refType === 'CHILD_OF' && reference.spanID === span.spanID
          )
        )
        .sort((a, b) => b.startTime + b.duration - (a.startTime + a.duration))
        .map(span2 => span2.spanID);
      refinedSpanData.push(Children.length ? { ...span, childSpanIds: Children } : { ...span });
    } else {
      refinedSpanData.push({ ...span });
    }
  });
  return refinedSpanData;
};

export default findChildSpanIds;
