// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import test2 from '../testCases/test2';
import test5 from '../testCases/test5';
import getChildOfSpans from './getChildOfSpans';

describe('getChildOfSpans', () => {
  it('Should not remove CHILD_OF child spans if there are any', () => {
    const spanMap = test2.trace.spans.reduce((map, span) => {
      map.set(span.spanID, span);
      return map;
    }, new Map());
    const refinedSpanMap = getChildOfSpans(spanMap);
    const expectedRefinedSpanMap = spanMap;

    expect(refinedSpanMap.size).toBe(3);
    expect(refinedSpanMap).toStrictEqual(expectedRefinedSpanMap);
  });
  it('Should remove FOLLOWS_FROM child spans if there are any', () => {
    const spanMap = test5.trace.spans.reduce((map, span) => {
      map.set(span.spanID, span);
      return map;
    }, new Map());
    const refinedSpanMap = getChildOfSpans(spanMap);
    const expectedRefinedSpanMap = new Map().set(test5.trace.spans[0].spanID, {
      ...test5.trace.spans[0],
      childSpanIds: [],
    });

    expect(refinedSpanMap.size).toBe(1);
    expect(refinedSpanMap).toStrictEqual(expectedRefinedSpanMap);
  });

  it('Should not modify the original trace spans', () => {
    // Store the original childSpanIds reference and value
    const originalParentSpan = test5.trace.spans[0];
    const originalChildSpanIdsRef = originalParentSpan.childSpanIds;
    const originalChildSpanIdsValue = [...originalParentSpan.childSpanIds];

    const spanMap = test5.trace.spans.reduce((map, span) => {
      map.set(span.spanID, span);
      return map;
    }, new Map());

    // Run the function
    getChildOfSpans(spanMap);

    // Verify the original span was not modified
    expect(originalParentSpan.childSpanIds).toBe(originalChildSpanIdsRef); // Same reference
    expect(originalParentSpan.childSpanIds).toEqual(originalChildSpanIdsValue); // Same values
  });
});
