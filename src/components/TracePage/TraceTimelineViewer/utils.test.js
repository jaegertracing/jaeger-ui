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
  calculateSpanPosition,
  calculateTimeAtPositon,
  convertTimeRangeToPercent,
  ensureWithinRange,
  hasTagKey,
  isClientSpan,
  isErrorSpan,
  isServerSpan,
  spanContainsErredSpan,
} from './utils';
import traceGenerator from '../../../demo/trace-generators';

it('calculateSpanPosition() maps a sub-range to percents with a zoom applied', () => {
  const args = {
    traceStartTime: 100,
    traceEndTime: 200,
    xStart: 0,
    xEnd: 50,
  };

  args.spanStart = 100;
  args.spanEnd = 200;
  expect(calculateSpanPosition(args)).toEqual({ xStart: 0, xEnd: 200 });

  args.spanStart = 100;
  args.spanEnd = 150;
  expect(calculateSpanPosition(args)).toEqual({ xStart: 0, xEnd: 100 });

  args.spanStart = 150;
  args.spanEnd = 200;
  expect(calculateSpanPosition(args)).toEqual({ xStart: 100, xEnd: 200 });
});

it('calculateTimeAtPositon() converts a percent to a value in [0, duration]', () => {
  const traceDuration = 1000;
  expect(calculateTimeAtPositon({ position: 0, traceDuration })).toBe(0);
  expect(calculateTimeAtPositon({ position: 100, traceDuration })).toBe(
    traceDuration
  );
  expect(calculateTimeAtPositon({ position: 50, traceDuration })).toBe(
    0.5 * traceDuration
  );
});

it('convertTimeRangeToPercent() converts a sub-range to percent start and end values', () => {
  const traceRange = [100, 200];
  expect(convertTimeRangeToPercent([100, 200], traceRange)).toEqual([0, 100]);
  expect(convertTimeRangeToPercent([199, 200], traceRange)).toEqual([99, 100]);
  expect(convertTimeRangeToPercent([100, 101], traceRange)).toEqual([0, 1]);
  expect(convertTimeRangeToPercent([100, 150], traceRange)).toEqual([0, 50]);
  expect(convertTimeRangeToPercent([0, 250], traceRange)).toEqual([-100, 150]);
});

it('ensureWithinRange() clamps numeric values', () => {
  const min = 10;
  const max = 20;
  expect(ensureWithinRange([min, max], -1)).toBe(10);
  expect(ensureWithinRange([min, max], 0)).toBe(10);
  expect(ensureWithinRange([min, max], 15)).toBe(15);
  expect(ensureWithinRange([min, max], 25)).toBe(20);
  expect(isNaN(ensureWithinRange([min, max], NaN))).toBe(true);
});

it('hasTagKey() returns true iff the key/value pair is found', () => {
  const tags = traceGenerator.tags();
  tags.push({ key: 'span.kind', value: 'server' });
  expect(hasTagKey([], 'span.kind', 'client')).toBe(false);
  expect(hasTagKey(tags, 'span.kind', 'client')).toBe(false);
  expect(hasTagKey(tags, 'span.kind', 'server')).toBe(true);
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

it('spanContainsErredSpan() is true only when a descendant has an error tag', () => {
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
