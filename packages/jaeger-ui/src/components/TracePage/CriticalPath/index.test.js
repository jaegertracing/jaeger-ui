// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import TraceCriticalPath from './index';
import test1 from './testCases/test1';
import test2 from './testCases/test2';
import test3 from './testCases/test3';
import test4 from './testCases/test4';
import test6 from './testCases/test6';
import test7 from './testCases/test7';
import test5 from './testCases/test5';
import test8 from './testCases/test8';
import test9 from './testCases/test9';

describe.each([[test1], [test2], [test3], [test4], [test5], [test6], [test7], [test8], [test9]])(
  'Happy Path',
  testProps => {
    it('should find criticalPathSections correctly', () => {
      const criticalPath = TraceCriticalPath(testProps.trace);
      expect(criticalPath).toStrictEqual(testProps.criticalPathSections);
    });
  }
);

describe('criticalPathForTrace immutability', () => {
  it('should not modify the original trace spans', () => {
    const originalSpans = test2.trace.spans.map(span => ({
      spanID: span.spanID,
      startTimeUnixMicros: span.startTimeUnixMicros,
      durationMicros: span.durationMicros,
      name: span.name,
    }));

    // Run the critical path algorithm
    TraceCriticalPath(test2.trace);

    // Verify the trace spans' primitive properties were not modified
    test2.trace.spans.forEach((span, i) => {
      const original = originalSpans[i];
      expect(span.spanID).toBe(original.spanID);
      expect(span.startTimeUnixMicros).toBe(original.startTimeUnixMicros);
      expect(span.durationMicros).toBe(original.durationMicros);
      expect(span.name).toBe(original.name);
    });
  });

  it('should not modify span childSpans arrays', () => {
    // Store original childSpans arrays (and their references)
    const originalChildSpans = test2.trace.spans.map(span => ({
      array: span.childSpans,
      length: span.childSpans.length,
    }));

    // Run the critical path algorithm
    TraceCriticalPath(test2.trace);

    // Verify childSpans were not modified (same reference and length)
    test2.trace.spans.forEach((span, index) => {
      expect(span.childSpans).toBe(originalChildSpans[index].array); // Same reference
      expect(span.childSpans.length).toBe(originalChildSpans[index].length); // Same length
    });
  });

  it('should not modify span links arrays', () => {
    // Store original links (and their references)
    const originalLinks = test2.trace.spans.map(span => ({
      array: span.links,
      length: span.links.length,
    }));

    // Run the critical path algorithm
    TraceCriticalPath(test2.trace);

    // Verify links were not modified (same reference and length)
    test2.trace.spans.forEach((span, index) => {
      expect(span.links).toBe(originalLinks[index].array); // Same reference
      expect(span.links.length).toBe(originalLinks[index].length);
    });
  });

  it('should not modify non-blocking spans parent childSpans', () => {
    // Store original childSpans of the parent in test5
    // test5 has a producer/consumer pair where the consumer is non-blocking
    const parentSpan = test5.trace.spans[0];
    const originalChildSpans = [...parentSpan.childSpans];
    const originalLength = originalChildSpans.length;

    // Run the critical path algorithm
    TraceCriticalPath(test5.trace);

    // Verify parent's childSpans was not modified
    expect(parentSpan.childSpans.length).toBe(originalLength);
    expect(parentSpan.childSpans).toEqual(originalChildSpans);
  });
});
