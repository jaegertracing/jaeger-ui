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

import test2 from '../testCases/test2';
import test5 from '../testCases/test5';
import removeFollowFromChildSpans from './removeFollowFromChildSpans';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';

describe('removeFollowFromChildSpans', () => {
  it('Should not remove CHILD_OF child spans if there are any', () => {
    const expectedRefinedSpanData = [...test2.trace.spans];
    const sanitizedData = sanitizeOverFlowingChildren(test2.trace.spans);
    const refinedSpanData = removeFollowFromChildSpans(sanitizedData);

    expect(refinedSpanData.length).toBe(3);
    expect(refinedSpanData).toStrictEqual(expectedRefinedSpanData);
  });
  it('Should remove FOLLOWS_FROM child spans if there are any', () => {
    const expectedRefinedSpanData = [test5.trace.spans[0]];
    const sanitizedData = sanitizeOverFlowingChildren(test5.trace.spans);
    const refinedSpanData = removeFollowFromChildSpans(sanitizedData);

    expect(refinedSpanData.length).toBe(1);
    expect(refinedSpanData).toStrictEqual(expectedRefinedSpanData);
  });
});
