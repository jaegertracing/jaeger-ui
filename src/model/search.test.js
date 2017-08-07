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

import _maxBy from 'lodash/maxBy';
import _minBy from 'lodash/minBy';

import * as orderBy from './order-by';
import { getTraceSummaries, getTraceSummary, sortTraces } from './search';
import traceGenerator from '../demo/trace-generators';

describe('getTraceSummary()', () => {
  let trace;
  let summary;

  beforeEach(() => {
    trace = traceGenerator.trace({ numberOfSpans: 10 });
    summary = getTraceSummary(trace);
  });

  it('derives duration, timestamp and numberOfSpans', () => {
    expect(summary.numberOfSpans).toBe(trace.spans.length);
    expect(summary.duration).toBe(trace.duration / 1000);
    expect(summary.timestamp).toBe(Math.floor(trace.timestamp / 1000));
  });

  it('handles error spans', () => {
    const errorTag = { key: 'error', value: true };
    expect(summary.numberOfErredSpans).toBe(0);
    trace.spans[0].tags.push(errorTag);
    expect(getTraceSummary(trace).numberOfErredSpans).toBe(1);
    trace.spans[1].tags.push(errorTag);
    expect(getTraceSummary(trace).numberOfErredSpans).toBe(2);
  });

  xit('generates the traceName', () => {});
  xit('derives services summations', () => {});
});

describe('getTraceSummaries()', () => {
  it('finds the max duration', () => {
    const traces = [traceGenerator.trace({}), traceGenerator.trace({})];
    const maxDuration = _maxBy(traces, 'duration').duration / 1000;
    expect(getTraceSummaries(traces).maxDuration).toBe(maxDuration);
  });
});

describe('sortTraces()', () => {
  const idMinSpans = 4;
  const idMaxSpans = 2;
  const rawTraces = [
    { ...traceGenerator.trace({ numberOfSpans: 3 }), traceID: 1 },
    { ...traceGenerator.trace({ numberOfSpans: 100 }), traceID: idMaxSpans },
    { ...traceGenerator.trace({ numberOfSpans: 5 }), traceID: 3 },
    { ...traceGenerator.trace({ numberOfSpans: 1 }), traceID: idMinSpans },
  ];
  const { traces } = getTraceSummaries(rawTraces);

  const { MOST_SPANS, LEAST_SPANS, LONGEST_FIRST, SHORTEST_FIRST, MOST_RECENT } = orderBy;

  const expecations = {
    [MOST_RECENT]: _maxBy(traces, trace => trace.timestamp).traceID,
    [LONGEST_FIRST]: _maxBy(traces, trace => trace.duration).traceID,
    [SHORTEST_FIRST]: _minBy(traces, trace => trace.duration).traceID,
    [MOST_SPANS]: idMaxSpans,
    [LEAST_SPANS]: idMinSpans,
  };
  expecations.invalidOrderBy = expecations[LONGEST_FIRST];

  for (const sortBy of Object.keys(expecations)) {
    it(`sorts by ${sortBy}`, () => {
      const traceID = expecations[sortBy];
      sortTraces(traces, sortBy);
      expect(traces[0].traceID).toBe(traceID);
    });
  }
});
