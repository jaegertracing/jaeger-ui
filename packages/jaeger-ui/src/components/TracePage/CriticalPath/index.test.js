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
    // Create a deep copy of the trace for comparison
    const originalTrace = JSON.parse(JSON.stringify(test2.trace));

    // Run the critical path algorithm
    TraceCriticalPath(test2.trace);

    // Verify the trace was not modified
    expect(JSON.stringify(test2.trace)).toBe(JSON.stringify(originalTrace));
  });

  it('should not modify span childSpanIds arrays', () => {
    // Store original childSpanIds arrays (and their references)
    const originalChildSpanIds = test2.trace.spans.map(span => ({
      array: span.childSpanIds,
      values: [...(span.childSpanIds || [])],
    }));

    // Run the critical path algorithm
    TraceCriticalPath(test2.trace);

    // Verify childSpanIds were not modified (same reference and values)
    test2.trace.spans.forEach((span, index) => {
      expect(span.childSpanIds).toBe(originalChildSpanIds[index].array); // Same reference
      expect(span.childSpanIds).toEqual(originalChildSpanIds[index].values); // Same values
    });
  });

  it('should not modify span references arrays', () => {
    // Store original references (and their references)
    const originalReferences = test2.trace.spans.map(span => ({
      array: span.references,
      values: span.references.map(ref => ({ ...ref })),
    }));

    // Run the critical path algorithm
    TraceCriticalPath(test2.trace);

    // Verify references were not modified (same reference and values)
    test2.trace.spans.forEach((span, index) => {
      expect(span.references).toBe(originalReferences[index].array); // Same reference
      expect(span.references.length).toBe(originalReferences[index].values.length);
    });
  });

  it('should not modify FOLLOWS_FROM spans parent childSpanIds', () => {
    // Store original childSpanIds of the parent in test5
    const parentSpan = test5.trace.spans[0];
    const originalChildSpanIds = [...parentSpan.childSpanIds];
    const originalLength = originalChildSpanIds.length;

    // Run the critical path algorithm
    TraceCriticalPath(test5.trace);

    // Verify parent's childSpanIds was not modified
    expect(parentSpan.childSpanIds.length).toBe(originalLength);
    expect(parentSpan.childSpanIds).toEqual(originalChildSpanIds);
  });
});
