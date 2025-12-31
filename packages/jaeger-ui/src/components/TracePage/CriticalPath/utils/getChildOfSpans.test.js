// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import test2 from '../testCases/test2';
import test5 from '../testCases/test5';
import getChildOfSpans from './getChildOfSpans';

describe('getChildOfSpans', () => {
  it('Should not remove CHILD_OF child spans if there are any', () => {
    const refinedSpanMap = getChildOfSpans(test2.trace.spanMap, test2.trace.rootSpans);

    expect(refinedSpanMap.size).toBe(3);
    // Should have same spans as original
    expect([...refinedSpanMap.keys()].sort()).toEqual([...test2.trace.spanMap.keys()].sort());
  });
  it('Should remove FOLLOWS_FROM child spans if there are any', () => {
    const refinedSpanMap = getChildOfSpans(test5.trace.spanMap, test5.trace.rootSpans);
    
    expect(refinedSpanMap.size).toBe(1);
    expect(refinedSpanMap.has(test5.trace.spans[0].spanID)).toBe(true);
    const rootSpan = refinedSpanMap.get(test5.trace.spans[0].spanID);
    expect(rootSpan.childSpans.length).toBe(0);
  });
});
