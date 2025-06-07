// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  findServerChildSpan,
  createViewedBoundsFunc,
  createSparseViewedBoundsFunc,
  analyzeTraceGaps,
  isClientSpan,
  isErrorSpan,
  isServerSpan,
  spanContainsErredSpan,
  spanHasTag,
  DEFAULT_SPARSE_TRACE_CONFIG,
} from './utils';

import traceGenerator from '../../../demo/trace-generators';

describe('TraceTimelineViewer/utils', () => {
  describe('getViewedBounds()', () => {
    it('works for the full range', () => {
      const args = { min: 1, max: 2, viewStart: 0, viewEnd: 1 };
      const { start, end } = createViewedBoundsFunc(args)(1, 2);
      expect(start).toBe(0);
      expect(end).toBe(1);
    });

    it('works for a sub-range with a full view', () => {
      const args = { min: 1, max: 2, viewStart: 0, viewEnd: 1 };
      const { start, end } = createViewedBoundsFunc(args)(1.25, 1.75);
      expect(start).toBe(0.25);
      expect(end).toBe(0.75);
    });

    it('works for a sub-range that fills the view', () => {
      const args = { min: 1, max: 2, viewStart: 0.25, viewEnd: 0.75 };
      const { start, end } = createViewedBoundsFunc(args)(1.25, 1.75);
      expect(start).toBe(0);
      expect(end).toBe(1);
    });

    it('works for a sub-range that within a sub-view', () => {
      const args = { min: 100, max: 200, viewStart: 0.1, viewEnd: 0.9 };
      const { start, end } = createViewedBoundsFunc(args)(130, 170);
      expect(start).toBe(0.25);
      expect(end).toBe(0.75);
    });
  });

  describe('spanHasTag() and variants', () => {
    it('returns true iff the key/value pair is found', () => {
      const tags = traceGenerator.tags();
      tags.push({ key: 'span.kind', value: 'server' });
      expect(spanHasTag('span.kind', 'client', { tags })).toBe(false);
      expect(spanHasTag('span.kind', 'client', { tags })).toBe(false);
      expect(spanHasTag('span.kind', 'server', { tags })).toBe(true);
    });

    const spanTypeTestCases = [
      { fn: isClientSpan, name: 'isClientSpan', key: 'span.kind', value: 'client' },
      { fn: isServerSpan, name: 'isServerSpan', key: 'span.kind', value: 'server' },
      { fn: isErrorSpan, name: 'isErrorSpan', key: 'error', value: true },
      { fn: isErrorSpan, name: 'isErrorSpan', key: 'error', value: 'true' },
    ];

    spanTypeTestCases.forEach(testCase => {
      const msg = `${testCase.name}() is true only when a ${testCase.key}=${testCase.value} tag is present`;
      it(msg, () => {
        const span = { tags: traceGenerator.tags() };
        expect(testCase.fn(span)).toBe(false);
        span.tags.push(testCase);
        expect(testCase.fn(span)).toBe(true);
      });
    });
  });

  describe('spanContainsErredSpan()', () => {
    it('returns true only when a descendant has an error tag', () => {
      const errorTag = { key: 'error', type: 'bool', value: true };
      const getTags = withError =>
        withError ? traceGenerator.tags().concat(errorTag) : traceGenerator.tags();

      // Using a string to generate the test spans. Each line results in a span. The
      // left number indicates whether or not the generated span has a descendant
      // with an error tag (the expectation). The length of the line indicates the
      // depth of the span (i.e. further right is higher depth). The right number
      // indicates whether or not the span has an error tag.
      const config = `
        1   0
        1     0
        0       1
        0     0
        1     0
        1       1
        0         1
        0           0
        1         0
        0           1
        0   0
      `
        .trim()
        .split('\n')
        .map(s => s.trim());
      // Get the expectation, str -> number -> bool
      const expectations = config.map(s => Boolean(Number(s[0])));
      const spans = config.map(line => ({
        depth: line.length,
        tags: getTags(+line.slice(-1)),
      }));

      expectations.forEach((target, i) => {
        // include the index in the expect condition to know which span failed
        // (if there is a failure, that is)
        const result = [i, spanContainsErredSpan(spans, i)];
        expect(result).toEqual([i, target]);
      });
    });
  });

  describe('findServerChildSpan()', () => {
    let spans;

    beforeEach(() => {
      spans = [
        { depth: 0, tags: [{ key: 'span.kind', value: 'client' }] },
        { depth: 1, tags: [] },
        { depth: 1, tags: [{ key: 'span.kind', value: 'server' }] },
        { depth: 1, tags: [{ key: 'span.kind', value: 'third-kind' }] },
        { depth: 1, tags: [{ key: 'span.kind', value: 'server' }] },
      ];
    });

    it('returns falsy if the frist span is not a client', () => {
      expect(findServerChildSpan(spans.slice(1))).toBeFalsy();
    });

    it('returns the first server span', () => {
      const span = findServerChildSpan(spans);
      expect(span).toBe(spans[2]);
    });

    it('bails when a non-child-depth span is encountered', () => {
      spans[1].depth++;
      expect(findServerChildSpan(spans)).toBeFalsy();
      spans[1].depth = spans[0].depth;
      expect(findServerChildSpan(spans)).toBeFalsy();
    });
  });

  describe('Sparse Trace Visualization', () => {
    describe('analyzeTraceGaps()', () => {
      it('should identify gaps between spans', () => {
        const spans = [
          {
            spanID: 'span1',
            startTime: 1000,
            duration: 100,
          },
          {
            spanID: 'span2',
            startTime: 5000, // 3900 microsecond gap
            duration: 200,
          },
        ];

        const gaps = analyzeTraceGaps(spans, 1000, 4200, DEFAULT_SPARSE_TRACE_CONFIG);

        expect(gaps).toHaveLength(1);
        expect(gaps[0].startTime).toBe(1100);
        expect(gaps[0].endTime).toBe(5000);
        expect(gaps[0].duration).toBe(3900);
        expect(gaps[0].shouldCollapse).toBe(true); // 3900 > 200 * 3
      });

      it('should not collapse small gaps', () => {
        const spans = [
          {
            spanID: 'span1',
            startTime: 1000,
            duration: 1000,
          },
          {
            spanID: 'span2',
            startTime: 2500, // 500 microsecond gap
            duration: 1000,
          },
        ];

        const gaps = analyzeTraceGaps(spans, 1000, 2500, DEFAULT_SPARSE_TRACE_CONFIG);

        expect(gaps).toHaveLength(1);
        expect(gaps[0].shouldCollapse).toBe(false); // 500 < 1000 * 3
      });

      it('should handle overlapping spans', () => {
        const spans = [
          {
            spanID: 'span1',
            startTime: 1000,
            duration: 2000,
          },
          {
            spanID: 'span2',
            startTime: 1500, // Overlapping
            duration: 1000,
          },
        ];

        const gaps = analyzeTraceGaps(spans, 1000, 3000, DEFAULT_SPARSE_TRACE_CONFIG);

        expect(gaps).toHaveLength(0); // No gaps for overlapping spans
      });

      it('should respect minimum gap duration threshold', () => {
        const spans = [
          {
            spanID: 'span1',
            startTime: 1000,
            duration: 100,
          },
          {
            spanID: 'span2',
            startTime: 1500, // 400 microsecond gap (less than 1 second minimum)
            duration: 100,
          },
        ];

        const gaps = analyzeTraceGaps(spans, 1000, 1600, DEFAULT_SPARSE_TRACE_CONFIG);

        expect(gaps).toHaveLength(0); // Gap too small (< 1 second)
      });
    });

    describe('createSparseViewedBoundsFunc()', () => {
      it('should return standard bounds function when no collapsible gaps', () => {
        const viewRange = {
          min: 1000,
          max: 5000,
          viewStart: 0,
          viewEnd: 1,
        };
        const gaps = [];

        const boundsFunc = createSparseViewedBoundsFunc(viewRange, gaps);
        const result = boundsFunc(2000, 3000);

        expect(result.start).toBeCloseTo(0.25);
        expect(result.end).toBeCloseTo(0.5);
      });

      it('should compress timeline when gaps are collapsed', () => {
        const viewRange = {
          min: 1000,
          max: 10000,
          viewStart: 0,
          viewEnd: 1,
        };
        const gaps = [
          {
            startTime: 2000,
            endTime: 8000,
            duration: 6000,
            shouldCollapse: true,
            collapsedWidth: 0.02, // 2% of timeline
          },
        ];

        const boundsFunc = createSparseViewedBoundsFunc(viewRange, gaps);

        // Test span before the gap
        const beforeGap = boundsFunc(1500, 1800);
        expect(beforeGap.start).toBeGreaterThan(0);
        expect(beforeGap.end).toBeLessThan(1);

        // Test span after the gap
        const afterGap = boundsFunc(8500, 9000);
        expect(afterGap.start).toBeGreaterThan(0);
        expect(afterGap.end).toBeLessThan(1);
      });
    });
  });
});
