// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import test1 from '../testCases/test1';
import test2 from '../testCases/test2';
import getChildOfSpans from './getChildOfSpans';
import findLastFinishingChildSpanId from './findLastFinishingChildSpan';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';

// Helper function to create CPSpan map from trace spans
function createCPSpanMap(spans) {
  return spans.reduce((map, span) => {
    const cpSpan = {
      spanID: span.spanID,
      startTime: span.startTime,
      duration: span.duration,
      references: span.references.map(ref => ({ ...ref })),
      childSpanIds: [...span.childSpanIds],
      hasChildren: span.hasChildren,
    };
    map.set(span.spanID, cpSpan);
    return map;
  }, new Map());
}

describe('findLastFinishingChildSpanId', () => {
  it('Should find lfc of a span correctly', () => {
    const spanMap = createCPSpanMap(test1.trace.spans);
    const refinedSpanMap = getChildOfSpans(spanMap);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);

    const currentSpan = sanitizedSpanMap.get('span-C');
    let lastFinishingChildSpan = findLastFinishingChildSpanId(sanitizedSpanMap, currentSpan);
    expect(lastFinishingChildSpan).toStrictEqual(sanitizedSpanMap.get('span-E'));

    // Second Case to check if it works with spawn time or not
    lastFinishingChildSpan = findLastFinishingChildSpanId(sanitizedSpanMap, currentSpan, 50);
    expect(lastFinishingChildSpan).toStrictEqual(sanitizedSpanMap.get('span-D'));
  });

  it('Should find lfc of a span correctly with test2', () => {
    const spanMap = createCPSpanMap(test2.trace.spans);
    const refinedSpanMap = getChildOfSpans(spanMap);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);

    const currentSpan = sanitizedSpanMap.get('span-X');
    let lastFinishingChildSpanId = findLastFinishingChildSpanId(sanitizedSpanMap, currentSpan);
    expect(lastFinishingChildSpanId).toStrictEqual(sanitizedSpanMap.get('span-C'));

    // Second Case to check if it works with spawn time or not
    lastFinishingChildSpanId = findLastFinishingChildSpanId(sanitizedSpanMap, currentSpan, 20);
    expect(lastFinishingChildSpanId).toBeUndefined();
  });
});
