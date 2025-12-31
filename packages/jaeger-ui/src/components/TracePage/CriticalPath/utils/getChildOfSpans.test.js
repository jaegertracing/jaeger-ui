// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import test2 from '../testCases/test2';
import test5 from '../testCases/test5';
import getChildOfSpans from './getChildOfSpans';
import { createCPSpan, createCPSpanMap } from './cpspan';

describe('getChildOfSpans', () => {
  it('Should not remove CHILD_OF child spans if there are any', () => {
    // Create CPSpan objects from the original spans
    const spanMap = createCPSpanMap(test2.trace.spans);
    const refinedSpanMap = getChildOfSpans(spanMap);

    expect(refinedSpanMap.size).toBe(3);
  });
  it('Should remove FOLLOWS_FROM child spans if there are any', () => {
    // Create CPSpan objects from the original spans
    const spanMap = createCPSpanMap(test5.trace.spans);
    const refinedSpanMap = getChildOfSpans(spanMap);

    expect(refinedSpanMap.size).toBe(1);
    // Check that the parent span has no children
    const parentSpan = refinedSpanMap.get(test5.trace.spans[0].spanID);
    expect(parentSpan?.childSpanIds).toEqual([]);
  });

  it('Should not modify the original trace spans', () => {
    // Store the original childSpanIds reference and value
    const originalParentSpan = test5.trace.spans[0];
    const originalChildSpanIdsRef = originalParentSpan.childSpanIds;
    const originalChildSpanIdsValue = [...originalParentSpan.childSpanIds];

    // Create CPSpan objects (copies) from the original spans
    const spanMap = createCPSpanMap(test5.trace.spans);

    // Run the function on CPSpan copies
    getChildOfSpans(spanMap);

    // Verify the original span was not modified
    expect(originalParentSpan.childSpanIds).toBe(originalChildSpanIdsRef); // Same reference
    expect(originalParentSpan.childSpanIds).toEqual(originalChildSpanIdsValue); // Same values
  });
});
