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
import test4 from '../testCases/test4';
import findChildSpanIds from './findChildSpanIds';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';

describe('findChildSpanIds', () => {
  it('Should find child spanIds correctly and also in sortorder of endTime', () => {
    const expectedRefinedSpanData = [...test2.trace.spans];
    expectedRefinedSpanData[0].childSpanIds = ['span-C', 'span-A'];
    const sanitizedData = sanitizeOverFlowingChildren(test2.trace.spans);
    const refinedSpanData = findChildSpanIds(sanitizedData);

    expect(refinedSpanData.length).toBe(3);
    expect(refinedSpanData).toStrictEqual(expectedRefinedSpanData);
  });
  it('Should find child spanIds correctly and also in sortorder of endTime', () => {
    const expectedRefinedSpanData = [test4.trace.spans[0]];
    const sanitizedData = sanitizeOverFlowingChildren(test4.trace.spans);
    const refinedSpanData = findChildSpanIds(sanitizedData);

    expect(refinedSpanData.length).toBe(1);
    expect(refinedSpanData).toStrictEqual(expectedRefinedSpanData);
  });
});
