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
import { createCPSpan, createCPSpanMap } from './cpspan';

// Function to make expected data for test6, test7, and test8
function getExpectedSanitizedData(spans, test) {
  // Define what the expected modifications are for each test
  const modifications = {
    test6: {
      'span-B': { duration: 15 },
      'span-C': { duration: 10, startTime: 15 },
    },
    test7: {
      'span-B': { duration: 15 },
      'span-C': { duration: 10 },
    },
    test8: {
      'span-B': { startTime: 10, duration: 20 },
    },
  };

  const mods = modifications[test];
  const spanMap = new Map();

  spans.forEach(span => {
    const cpSpan = createCPSpan(span);

    // Apply modifications if they exist for this span
    if (mods && mods[span.spanID]) {
      Object.assign(cpSpan, mods[span.spanID]);
    }

    spanMap.set(span.spanID, cpSpan);
  });

  return spanMap;
}

describe.each([
  [
    'child starts after parent ends - child dropped',
    test3,
    new Map().set(test3.trace.spans[0].spanID, {
      ...createCPSpan(test3.trace.spans[0]),
      childSpanIDs: [],
    }),
  ],
  [
    'child and grandchild start after parent ends - both dropped',
    test4,
    new Map().set(test4.trace.spans[0].spanID, {
      ...createCPSpan(test4.trace.spans[0]),
      childSpanIDs: [],
    }),
  ],
  [
    'child starts before parent and ends after - both truncated',
    test6,
    getExpectedSanitizedData(test6.trace.spans, 'test6'),
  ],
  [
    'child starts before parent - child start truncated',
    test7,
    getExpectedSanitizedData(test7.trace.spans, 'test7'),
  ],
  [
    'child starts before parent - child start adjusted',
    test8,
    getExpectedSanitizedData(test8.trace.spans, 'test8'),
  ],
  [
    'child ends before parent starts - child dropped',
    test9,
    new Map().set(test9.trace.spans[0].spanID, {
      ...createCPSpan(test9.trace.spans[0]),
      childSpanIDs: [],
    }),
  ],
])('sanitizeOverFlowingChildren - %s', (description, testProps, expectedSanitizedData) => {
  it(`should sanitize correctly: ${description}`, () => {
    const spanMap = createCPSpanMap(testProps.trace.spans);
    const refinedSpanMap = getChildOfSpans(spanMap);
    const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);

    // Compare size and keys
    expect(sanitizedSpanMap.size).toBe(expectedSanitizedData.size);
    expect([...sanitizedSpanMap.keys()].sort()).toEqual([...expectedSanitizedData.keys()].sort());

    // Compare each span's properties (except nested reference.span which may have circular refs)
    sanitizedSpanMap.forEach((span, spanId) => {
      const expectedSpan = expectedSanitizedData.get(spanId);
      expect(span.spanID).toBe(expectedSpan.spanID);
      expect(span.startTime).toBe(expectedSpan.startTime);
      expect(span.duration).toBe(expectedSpan.duration);
      expect(span.childSpanIDs).toEqual(expectedSpan.childSpanIDs);
      expect(span.references.length).toBe(expectedSpan.references.length);
      // Compare reference properties except the nested span object
      span.references.forEach((ref, i) => {
        expect(ref.spanID).toBe(expectedSpan.references[i].spanID);
        expect(ref.refType).toBe(expectedSpan.references[i].refType);
      });
    });
  });
});
