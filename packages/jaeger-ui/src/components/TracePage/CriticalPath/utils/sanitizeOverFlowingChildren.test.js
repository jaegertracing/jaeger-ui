// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import test3 from '../testCases/test3';
import test4 from '../testCases/test4';
import test6 from '../testCases/test6';
import test7 from '../testCases/test7';
import test8 from '../testCases/test8';
import test9 from '../testCases/test9';
import getChildOfSpans from './getChildOfSpans';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';

describe('sanitizeOverFlowingChildren', () => {
  it('Should handle test3 correctly', () => {
    const trace = test3.trace;
    const spanMap = trace.spanMap;
    const refinedSpanMap = getChildOfSpans(spanMap);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
    
    // Should have only the root span
    expect(sanitizedSpanMap.size).toBe(1);
    expect(sanitizedSpanMap.has(trace.spans[0].spanID)).toBe(true);
  });

  it('Should handle test4 correctly', () => {
    const trace = test4.trace;
    const spanMap = trace.spanMap;
    const refinedSpanMap = getChildOfSpans(spanMap);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
    
    // Should have only the root span
    expect(sanitizedSpanMap.size).toBe(1);
    expect(sanitizedSpanMap.has(trace.spans[0].spanID)).toBe(true);
  });

  it('Should handle test6 correctly - truncate overflowing children', () => {
    const trace = test6.trace;
    const spanMap = trace.spanMap;
    const refinedSpanMap = getChildOfSpans(spanMap);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
    
    expect(sanitizedSpanMap.size).toBe(3);
    const span1 = sanitizedSpanMap.get(trace.spans[1].spanID);
    const span2 = sanitizedSpanMap.get(trace.spans[2].spanID);
    expect(span1.duration).toBe(15); // Truncated
    expect(span2.duration).toBe(10); // Truncated
    expect(span2.startTime).toBe(15); // Adjusted
  });

  it('Should handle test7 correctly', () => {
    const trace = test7.trace;
    const spanMap = trace.spanMap;
    const refinedSpanMap = getChildOfSpans(spanMap);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
    
    expect(sanitizedSpanMap.size).toBe(3);
    const span1 = sanitizedSpanMap.get(trace.spans[1].spanID);
    const span2 = sanitizedSpanMap.get(trace.spans[2].spanID);
    expect(span1.duration).toBe(15); // Truncated
    expect(span2.duration).toBe(10); // Truncated
  });

  it('Should handle test8 correctly - child completely overlaps parent', () => {
    const trace = test8.trace;
    const spanMap = trace.spanMap;
    const refinedSpanMap = getChildOfSpans(spanMap);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
    
    expect(sanitizedSpanMap.size).toBe(2);
    const span1 = sanitizedSpanMap.get(trace.spans[1].spanID);
    expect(span1.startTime).toBe(10); // Adjusted to parent start
    expect(span1.duration).toBe(20); // Truncated to parent duration
  });

  it('Should handle test9 correctly', () => {
    const trace = test9.trace;
    const spanMap = trace.spanMap;
    const refinedSpanMap = getChildOfSpans(spanMap);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
    
    // Should have only the root span
    expect(sanitizedSpanMap.size).toBe(1);
    expect(sanitizedSpanMap.has(trace.spans[0].spanID)).toBe(true);
  });
});
