// @flow

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

import _map from 'lodash/map';
import _values from 'lodash/values';

import { LEAST_SPANS, LONGEST_FIRST, MOST_RECENT, MOST_SPANS, SHORTEST_FIRST } from './order-by';
import type { Trace } from '../types';
import type { TraceSummaries, TraceSummary } from '../types/search';

const isErrorTag = ({ key, value }) => key === 'error' && (value === true || value === 'true');

/**
 * Transforms a trace from the HTTP response to the data structure needed by the search page. Note: exported
 * for unit tests.
 *
 * @param trace Trace data in the format sent over the wire.
 * @return {TraceSummary} Summary of the trace data for use in the search results.
 */
export function getTraceSummary(trace: Trace): TraceSummary {
  const { processes, spans, traceID } = trace;

  let traceName = '';
  let minTs = Number.MAX_SAFE_INTEGER;
  let maxTs = Number.MIN_SAFE_INTEGER;
  let numErrorSpans = 0;
  // serviceName -> { name, numberOfSpans }
  const serviceMap = {};
  for (let i = 0; i < spans.length; i++) {
    const { duration, processID, references, startTime, tags } = spans[i];
    // time bounds of trace
    minTs = minTs > startTime ? startTime : minTs;
    maxTs = maxTs < startTime + duration ? startTime + duration : maxTs;
    // number of error tags
    if (tags.some(isErrorTag)) {
      numErrorSpans += 1;
    }
    // number of span per service
    const { serviceName } = processes[processID];
    let svcData = serviceMap[serviceName];
    if (svcData) {
      svcData.numberOfSpans += 1;
    } else {
      svcData = {
        name: serviceName,
        numberOfSpans: 1,
      };
      serviceMap[serviceName] = svcData;
    }
    if (!references || !references.length) {
      const { operationName } = spans[i];
      traceName = `${svcData.name}: ${operationName}`;
    }
  }
  return {
    traceName,
    traceID,
    duration: (maxTs - minTs) / 1000,
    numberOfErredSpans: numErrorSpans,
    numberOfSpans: spans.length,
    services: _values(serviceMap),
    timestamp: minTs / 1000,
  };
}

/**
 * Transforms `Trace` values into `TraceSummary` values and finds the max duration of the traces.
 *
 * @param  {(Trace | Error)[]} _traces The trace data in the format from the HTTP request.
 * @return {TraceSummaries} The `{ traces, maxDuration }` value.
 */
export function getTraceSummaries(_traces: (Trace | Error)[]): TraceSummaries {
  const traces = _traces
    .map(item => {
      if (item instanceof Error) {
        return null;
      }
      return getTraceSummary(item);
    })
    .filter(Boolean);
  const maxDuration = Math.max(..._map(traces, 'duration'));
  return { maxDuration, traces };
}

const comparators = {
  [MOST_RECENT]: (a, b) => +(b.timestamp > a.timestamp) || +(a.timestamp === b.timestamp) - 1,
  [SHORTEST_FIRST]: (a, b) => +(a.duration > b.duration) || +(a.duration === b.duration) - 1,
  [LONGEST_FIRST]: (a, b) => +(b.duration > a.duration) || +(a.duration === b.duration) - 1,
  [MOST_SPANS]: (a, b) => +(b.numberOfSpans > a.numberOfSpans) || +(a.numberOfSpans === b.numberOfSpans) - 1,
  [LEAST_SPANS]: (a, b) => +(a.numberOfSpans > b.numberOfSpans) || +(a.numberOfSpans === b.numberOfSpans) - 1,
};

/**
 * Sorts `TraceSummary[]`, in place.
 *
 * @param  {TraceSummary[]} traces The `TraceSummary` array to sort.
 * @param  {string} sortBy A sort specification, see ./order-by.js.
 */
export function sortTraces(traces: TraceSummary[], sortBy: string) {
  const comparator = comparators[sortBy] || comparators[LONGEST_FIRST];
  traces.sort(comparator);
}
