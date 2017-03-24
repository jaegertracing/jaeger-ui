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

import { maxBy, minBy } from 'lodash';

import * as searchSelectors from './search';
import traceGenerator from '../demo/trace-generators';

it('transformTrace() works accurately', () => {
  const trace = traceGenerator.trace({});
  const transformedTrace = searchSelectors.transformTrace(trace);

  expect(transformedTrace.numberOfSpans).toBe(trace.spans.length);

  expect(transformedTrace.duration).toBe(trace.duration / 1000);

  expect(transformedTrace.timestamp).toBe(Math.floor(trace.timestamp / 1000));
});

it('transformTraceResults() calculates the max duration of all traces', () => {
  const traces = [traceGenerator.trace({}), traceGenerator.trace({})];
  const traceDurationOne = searchSelectors.transformTrace(traces[0]).duration;
  const traceDurationTwo = searchSelectors.transformTrace(traces[1]).duration;

  const expectedMaxDuration = traceDurationOne > traceDurationTwo
    ? traceDurationOne
    : traceDurationTwo;

  const { maxDuration } = searchSelectors.transformTraceResults(traces);

  expect(maxDuration).toBe(expectedMaxDuration);
});

it('getSortedTraceResults() sorting works', () => {
  const testTraces = [
    { ...traceGenerator.trace({ numberOfSpans: 3 }), traceID: 1 },
    { ...traceGenerator.trace({ numberOfSpans: 100 }), traceID: 2 },
    { ...traceGenerator.trace({ numberOfSpans: 5 }), traceID: 3 },
    { ...traceGenerator.trace({ numberOfSpans: 1 }), traceID: 4 },
  ];
  const {
    getSortedTraceResults,
    MOST_SPANS,
    LEAST_SPANS,
    LONGEST_FIRST,
    SHORTEST_FIRST,
    MOST_RECENT,
  } = searchSelectors;

  const { traces } = searchSelectors.transformTraceResults(testTraces);
  const maxDurationTraceID = maxBy(traces, trace => trace.duration).traceID;
  const minDurationTraceID = minBy(traces, trace => trace.duration).traceID;
  const mostRecentTraceID = maxBy(traces, trace => trace.timestamp).traceID;
  expect(getSortedTraceResults(traces, MOST_RECENT)[0].traceID).toBe(
    mostRecentTraceID
  );

  expect(getSortedTraceResults(traces, LONGEST_FIRST)[0].traceID).toBe(
    maxDurationTraceID
  );

  expect(getSortedTraceResults(traces, SHORTEST_FIRST)[0].traceID).toBe(
    minDurationTraceID
  );

  expect(getSortedTraceResults(traces, MOST_SPANS)[0].traceID).toBe(2);

  expect(getSortedTraceResults(traces, LEAST_SPANS)[0].traceID).toBe(4);
  expect(getSortedTraceResults(traces, 'invalid')[0].traceID).toBe(
    maxDurationTraceID
  );
});

it('calculatePercentOfTotal() works properly', () => {
  const testCases = [
    {
      input: [[0, 3], [1, 3], [1, 4], [9, 10]],
      expectedOutput: 5,
    },
    {
      input: [[1, 3], [1, 4], [9, 10], [0, 11]],
      expectedOutput: 11,
    },
    {
      input: [[0, 10], [15, 20]],
      expectedOutput: 15,
    },
  ];
  testCases.forEach(testCase => {
    expect(searchSelectors.calculatePercentOfTotal(testCase.input)).toBe(
      testCase.expectedOutput
    );
  });
});
