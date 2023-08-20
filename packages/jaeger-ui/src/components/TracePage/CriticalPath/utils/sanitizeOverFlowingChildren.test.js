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

import test3 from '../testCases/test3';
import test4 from '../testCases/test4';
import test6 from '../testCases/test6';
import test7 from '../testCases/test7';
import getChildOfSpans from './getChildOfSpans';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';

// Function to make expected data for test6 and test7
function getExpectedSanitizedData(spans, test) {
  const testSanitizedData = {
    test6: [spans[0], { ...spans[1], duration: 15 }, { ...spans[2], duration: 10, startTime: 15 }],
    test7: [spans[0], { ...spans[1], duration: 15 }, { ...spans[2], duration: 10 }],
  };
  const spanMap = testSanitizedData[test].reduce((map, span) => {
    map.set(span.spanID, span);
    return map;
  }, new Map());
  return spanMap;
}

describe.each([
  [test3, new Map().set(test3.trace.spans[0].spanID, test3.trace.spans[0])],
  [test4, new Map().set(test4.trace.spans[0].spanID, test4.trace.spans[0])],
  [test6, getExpectedSanitizedData(test6.trace.spans, 'test6')],
  [test7, getExpectedSanitizedData(test7.trace.spans, 'test7')],
])('sanitizeOverFlowingChildren', (testProps, expectedSanitizedData) => {
  it('Should sanitize the data(overflowing spans) correctly', () => {
    const refinedSpanData = getChildOfSpans(testProps.trace.spans);
    const spanMap = refinedSpanData.reduce((map, span) => {
      map.set(span.spanID, span);
      return map;
    }, new Map());
    const sanitizedSpanMap = sanitizeOverFlowingChildren(spanMap);
    expect(sanitizedSpanMap).toStrictEqual(expectedSanitizedData);
  });
});
