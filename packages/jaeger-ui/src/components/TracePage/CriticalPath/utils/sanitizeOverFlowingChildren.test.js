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

import test3 from '../testCases/test3';
import test4 from '../testCases/test4';
import test6 from '../testCases/test6';
import test7 from '../testCases/test7';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';

// Function to make expected data for test6 and test7
function getExpectedSanitizedData(spans, test = 'test6') {
  const expectedSanitizedData = spans.map((span, index) => {
    if (index === 1) {
      return { ...span, duration: 15 };
    }
    if (index === 2) {
      return test === 'test7' ? { ...span, duration: 10 } : { ...span, duration: 10, startTime: 15 };
    }
    return span;
  });
  return expectedSanitizedData;
}

describe.each([
  [test3, [test3.trace.spans[0]]],
  [test4, [test4.trace.spans[0]]],
  [test6, getExpectedSanitizedData(test6.trace.spans)],
  [test7, getExpectedSanitizedData(test7.trace.spans, 'test7')],
])('sanitizeOverFlowingChildren', (testProps, expectedSanitizedData) => {
  it('Should sanitize the data(overflowing spans) correctly', () => {
    const sanitizedData = sanitizeOverFlowingChildren(testProps.trace.spans);
    expect(sanitizedData).toStrictEqual(expectedSanitizedData);
  });
});
