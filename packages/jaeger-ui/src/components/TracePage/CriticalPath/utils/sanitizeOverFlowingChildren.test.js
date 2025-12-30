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

// Function to make expected data for test6 and test7
// For these tests, child spans may be removed, so we check which spans remain
function getExpectedSanitizedData(trace, testName) {
  const spans = trace.spans;
  const testSanitizedData = {
    test6: [spans[0], { ...spans[1], duration: 15 }, { ...spans[2], duration: 10, startTime: 15 }],
    test7: [spans[0], { ...spans[1], duration: 15 }, { ...spans[2], duration: 10 }],
    test8: [spans[0], { ...spans[1], startTime: 10, duration: 20 }],
  };
  const expectedSpans = testSanitizedData[testName];
  const remainingSpanIds = new Set(expectedSpans.map(s => s.spanID));

  const spanMap = new Map();
  expectedSpans.forEach(span => {
    // Get children from nodesBySpanId, but only include those that remain after sanitization
    const node = trace.nodesBySpanId?.get(span.spanID);
    const allChildIds = node ? node.children.map(child => child.value) : [];
    const childSpanIds = allChildIds.filter(id => remainingSpanIds.has(id));
    spanMap.set(span.spanID, { ...span, childSpanIds });
  });
  return spanMap;
}

// Helper to populate childSpanIds from trace
function populateChildSpanIds(trace) {
  const spanMap = new Map();
  trace.spans.forEach(span => {
    const node = trace.nodesBySpanId?.get(span.spanID);
    const childSpanIds = node ? node.children.map(child => child.value) : [];
    spanMap.set(span.spanID, { ...span, childSpanIds });
  });
  return spanMap;
}

// Helper to get expected data with childSpanIds populated from trace
function getExpectedDataWithChildren(trace, spanID, overrides = {}) {
  const span = trace.spans.find(s => s.spanID === spanID);
  if (!span) return new Map();

  const node = trace.nodesBySpanId?.get(spanID);
  const childSpanIds = node ? node.children.map(child => child.value) : [];

  return new Map().set(spanID, { ...span, ...overrides, childSpanIds });
}

describe.each([
  [test3, trace => getExpectedDataWithChildren(trace, trace.spans[0].spanID)],
  [test4, trace => getExpectedDataWithChildren(trace, trace.spans[0].spanID)],
  [test6, trace => getExpectedSanitizedData(trace, 'test6')],
  [test7, trace => getExpectedSanitizedData(trace, 'test7')],
  [test8, trace => getExpectedSanitizedData(trace, 'test8')],
  [test9, trace => getExpectedDataWithChildren(trace, trace.spans[0].spanID)],
])('sanitizeOverFlowingChildren', (testProps, expectedDataFn) => {
  it('Should sanitize the data(overflowing spans) correctly', () => {
    const spanMapWithChildren = populateChildSpanIds(testProps.trace);
    const refinedSpanMap = getChildOfSpans(spanMapWithChildren);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
    const expectedSanitizedData = expectedDataFn(testProps.trace);
    expect(sanitizedSpanMap).toStrictEqual(expectedSanitizedData);
  });
});
