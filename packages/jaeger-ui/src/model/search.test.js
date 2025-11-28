// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _maxBy from 'lodash/maxBy';
import _minBy from 'lodash/minBy';

import * as orderBy from './order-by';
import { sortTraces } from './search';
import traceGenerator from '../demo/trace-generators';
import transformTraceData from './transform-trace-data';

describe('sortTraces()', () => {
  const idMinSpans = 4;
  const idMaxSpans = 2;
  const traces = [
    { ...transformTraceData(traceGenerator.trace({ numberOfSpans: 3 })), traceID: 1 },
    { ...transformTraceData(traceGenerator.trace({ numberOfSpans: 100 })), traceID: idMaxSpans },
    { ...transformTraceData(traceGenerator.trace({ numberOfSpans: 5 })), traceID: 3 },
    { ...transformTraceData(traceGenerator.trace({ numberOfSpans: 1 })), traceID: idMinSpans },
  ];

  const { MOST_SPANS, LEAST_SPANS, LONGEST_FIRST, SHORTEST_FIRST, MOST_RECENT } = orderBy;

  const expecations = {
    [MOST_RECENT]: _maxBy(traces, trace => trace.startTime).traceID,
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
