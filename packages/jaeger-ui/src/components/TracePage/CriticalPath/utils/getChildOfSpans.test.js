// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import test2 from '../testCases/test2';
import test5 from '../testCases/test5';
import getChildOfSpans from './getChildOfSpans';

describe('getChildOfSpans', () => {
  it('Should not remove CHILD_OF child spans if there are any', () => {
    const trace = test2.trace;
    // Use spanMap directly from trace
    const spanMap = trace.spanMap;

    const refinedSpanMap = getChildOfSpans(spanMap);

    expect(refinedSpanMap.size).toBe(3);
    // Should have same spans as original
    expect([...refinedSpanMap.keys()].sort()).toEqual([...spanMap.keys()].sort());
  });
  it('Should remove FOLLOWS_FROM child spans if there are any', () => {
    const trace = test5.trace;
    // Use spanMap directly from trace
    const spanMap = trace.spanMap;

    const refinedSpanMap = getChildOfSpans(spanMap);
    
    expect(refinedSpanMap.size).toBe(1);
    expect(refinedSpanMap.has(test5.trace.spans[0].spanID)).toBe(true);
    const rootSpan = refinedSpanMap.get(test5.trace.spans[0].spanID);
    expect(rootSpan.childSpans.length).toBe(0);
  });
});
