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

import _maxBy from 'lodash/maxBy';
import _minBy from 'lodash/minBy';

import * as orderBy from './order-by';
import { getTraceSummaries, getTraceSummary, sortTraces } from './search';
import traceGenerator from '../demo/trace-generators';
import transformTraceData from '../model/transform-trace-data';

describe('getTraceSummary()', () => {
  let trace;
  let summary;

  beforeEach(() => {
    trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 2 }));
    summary = getTraceSummary(trace);
  });

  it('derives duration, timestamp and numberOfSpans', () => {
    expect(summary.numberOfSpans).toBe(trace.spans.length);
    expect(summary.duration).toBe(trace.duration / 1000);
    expect(summary.timestamp).toBe(Math.floor(trace.startTime / 1000));
  });

  it('handles error spans', () => {
    const errorTag = { key: 'error', value: true };
    expect(summary.numberOfErredSpans).toBe(0);
    trace.spans[0].tags.push(errorTag);
    expect(getTraceSummary(trace).numberOfErredSpans).toBe(1);
    trace.spans[1].tags.push(errorTag);
    expect(getTraceSummary(trace).numberOfErredSpans).toBe(2);
  });

  it('generates the traceName', () => {
    trace = {
      traceID: 'main-id',
      spans: [
        {
          traceID: 'main-id',
          processID: 'pid0',
          spanID: 'span-id-0',
          operationName: 'op0',
          startTime: 1502221240933000,
          duration: 236857,
          tags: [],
        },
        {
          traceID: 'main-id',
          processID: 'pid1',
          spanID: 'span-child',
          operationName: 'op1',
          startTime: 1502221241144382,
          duration: 25305,
          tags: [],
          references: [{ refType: 'CHILD_OF', traceID: 'main-id', spanID: 'span-id-0' }],
        },
      ],
      duration: 236857,
      timestamp: 1502221240933000,
      processes: {
        pid0: {
          processID: 'pid0',
          serviceName: 'serviceA',
          tags: [],
        },
        pid1: {
          processID: 'pid1',
          serviceName: 'serviceB',
          tags: [],
        },
      },
    };
    const { traceName } = getTraceSummary(trace);
    expect(traceName).toBe('serviceA: op0');
  });

  xit('derives services summations', () => {});
});

describe('getTraceSummaries()', () => {
  it('finds the max duration', () => {
    const traces = [
      transformTraceData(traceGenerator.trace({})),
      transformTraceData(traceGenerator.trace({})),
    ];
    const maxDuration = _maxBy(traces, 'duration').duration / 1000;
    expect(getTraceSummaries(traces).maxDuration).toBe(maxDuration);
  });
});

describe('sortTraces()', () => {
  const idMinSpans = 4;
  const idMaxSpans = 2;
  const rawTraces = [
    { ...transformTraceData(traceGenerator.trace({ numberOfSpans: 3 })), traceID: 1 },
    { ...transformTraceData(traceGenerator.trace({ numberOfSpans: 100 })), traceID: idMaxSpans },
    { ...transformTraceData(traceGenerator.trace({ numberOfSpans: 5 })), traceID: 3 },
    { ...transformTraceData(traceGenerator.trace({ numberOfSpans: 1 })), traceID: idMinSpans },
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

  Object.keys(expecations).forEach(sortBy => {
    it(`sorts by ${sortBy}`, () => {
      const traceID = expecations[sortBy];
      sortTraces(traces, sortBy);
      expect(traces[0].traceID).toBe(traceID);
    });
  });
});
