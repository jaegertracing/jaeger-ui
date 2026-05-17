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
      const { sections, failed } = TraceCriticalPath(testProps.trace);
      expect(sections).toStrictEqual(testProps.criticalPathSections);
      expect(failed).toBe(false);
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

    TraceCriticalPath(test2.trace);

    test2.trace.spans.forEach((span, i) => {
      const original = originalSpans[i];
      expect(span.spanID).toBe(original.spanID);
      expect(span.startTimeUnixMicros).toBe(original.startTimeUnixMicros);
      expect(span.durationMicros).toBe(original.durationMicros);
      expect(span.name).toBe(original.name);
    });
  });

  it('should not modify span childSpans arrays', () => {
    const originalChildSpans = test2.trace.spans.map(span => ({
      array: span.childSpans,
      length: span.childSpans.length,
    }));

    TraceCriticalPath(test2.trace);

    test2.trace.spans.forEach((span, index) => {
      expect(span.childSpans).toBe(originalChildSpans[index].array);
      expect(span.childSpans.length).toBe(originalChildSpans[index].length);
    });
  });

  it('should not modify span links arrays', () => {
    const originalLinks = test2.trace.spans.map(span => ({
      array: span.links,
      length: span.links.length,
    }));

    TraceCriticalPath(test2.trace);

    test2.trace.spans.forEach((span, index) => {
      expect(span.links).toBe(originalLinks[index].array);
      expect(span.links.length).toBe(originalLinks[index].length);
    });
  });

  it('should not modify non-blocking spans parent childSpans', () => {
    const parentSpan = test5.trace.spans[0];
    const originalChildSpans = [...parentSpan.childSpans];
    const originalLength = originalChildSpans.length;

    TraceCriticalPath(test5.trace);

    expect(parentSpan.childSpans.length).toBe(originalLength);
    expect(parentSpan.childSpans).toEqual(originalChildSpans);
  });
});

// A root span with null childSpans will cause createCPSpanMap to throw naturally.
const badRootSpan = { spanID: 'bad-root', childSpans: null };

describe('criticalPathForTrace error handling', () => {
  it('should return failed:true and empty sections when the only root span throws', () => {
    const { sections, failed } = TraceCriticalPath({ rootSpans: [badRootSpan] });

    expect(failed).toBe(true);
    expect(sections).toEqual([]);
  });

  it('should return failed:true and partial sections when one of two root spans throws', () => {
    // First root span is invalid (throws), second is a valid root from test1 (succeeds).
    const twoRootTrace = {
      rootSpans: [badRootSpan, ...test1.trace.rootSpans],
    };

    const { sections, failed } = TraceCriticalPath(twoRootTrace);

    expect(failed).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
  });
});
