// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import test2 from '../testCases/test2';
import test5 from '../testCases/test5';
import getChildOfSpans from './getChildOfSpans';

describe('getChildOfSpans', () => {
  it('Should not remove CHILD_OF child spans if there are any', () => {
    const trace = test2.trace;
    // Populate childSpanIds from nodesBySpanId for testing
    const spanMap = new Map();
    trace.spans.forEach(span => {
      const node = trace.nodesBySpanId?.get(span.spanID);
      const childSpanIds = node ? node.children.map(child => child.value) : [];
      spanMap.set(span.spanID, { ...span, childSpanIds });
    });

    const refinedSpanMap = getChildOfSpans(spanMap);
    const expectedRefinedSpanMap = spanMap;

    expect(refinedSpanMap.size).toBe(3);
    expect(refinedSpanMap).toStrictEqual(expectedRefinedSpanMap);
  });
  it('Should remove FOLLOWS_FROM child spans if there are any', () => {
    const trace = test5.trace;
    // Populate childSpanIds from nodesBySpanId for testing
    const spanMap = new Map();
    trace.spans.forEach(span => {
      const node = trace.nodesBySpanId?.get(span.spanID);
      const childSpanIds = node ? node.children.map(child => child.value) : [];
      spanMap.set(span.spanID, { ...span, childSpanIds });
    });

    const refinedSpanMap = getChildOfSpans(spanMap);
    const expectedRefinedSpanMap = new Map().set(test5.trace.spans[0].spanID, {
      ...test5.trace.spans[0],
      childSpanIds: [],
    });

    expect(refinedSpanMap.size).toBe(1);
    expect(refinedSpanMap).toStrictEqual(expectedRefinedSpanMap);
  });
});
