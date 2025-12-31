// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import test1 from '../testCases/test1';
import test2 from '../testCases/test2';
import getChildOfSpans from './getChildOfSpans';
import findLastFinishingChildSpanId from './findLastFinishingChildSpan';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';

describe('findLastFinishingChildSpanId', () => {
  it('Should find lfc of a span correctly', () => {
    const trace = test1.trace;
    // Use spanMap directly from trace
    const spanMap = trace.spanMap;

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
    const trace = test2.trace;
    // Use spanMap directly from trace
    const spanMap = trace.spanMap;

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
