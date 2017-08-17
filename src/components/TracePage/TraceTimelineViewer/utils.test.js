// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {
  getPositionInRange,
  getViewedBounds,
  isClientSpan,
  isErrorSpan,
  isServerSpan,
  spanContainsErredSpan,
  spanHasTag,
} from './utils';

import traceGenerator from '../../../demo/trace-generators';

describe('TraceTimelineViewer/utils', () => {
  describe('getViewedBounds()', () => {
    it('works for the full range', () => {
      const args = { min: 1, max: 2, start: 1, end: 2, viewStart: 0, viewEnd: 1 };
      const { start, end } = getViewedBounds(args);
      expect(start).toBe(0);
      expect(end).toBe(1);
    });

    it('works for a sub-range with a full view', () => {
      const args = { min: 1, max: 2, start: 1.25, end: 1.75, viewStart: 0, viewEnd: 1 };
      const { start, end } = getViewedBounds(args);
      expect(start).toBe(0.25);
      expect(end).toBe(0.75);
    });

    it('works for a sub-range that fills the view', () => {
      const args = { min: 1, max: 2, start: 1.25, end: 1.75, viewStart: 0.25, viewEnd: 0.75 };
      const { start, end } = getViewedBounds(args);
      expect(start).toBe(0);
      expect(end).toBe(1);
    });

    it('works for a sub-range that within a sub-view', () => {
      const args = { min: 100, max: 200, start: 130, end: 170, viewStart: 0.1, viewEnd: 0.9 };
      const { start, end } = getViewedBounds(args);
      expect(start).toBe(0.25);
      expect(end).toBe(0.75);
    });
  });

  describe('getPositionInRange()', () => {
    it('gets the position of a value within a range', () => {
      expect(getPositionInRange(100, 200, 150)).toBe(0.5);
      expect(getPositionInRange(100, 200, 0)).toBe(-1);
      expect(getPositionInRange(100, 200, 200)).toBe(1);
      expect(getPositionInRange(100, 200, 100)).toBe(0);
      expect(getPositionInRange(0, 200, 100)).toBe(0.5);
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
});
