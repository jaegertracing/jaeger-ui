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

import { createSelector } from 'reselect';
import { sortBy } from 'lodash';
import { getTraceTimestamp, getTraceDuration, getTraceName } from './trace';
import { getPercentageOfDuration } from '../utils/date';

const getTraces = state => state.traces;
const getTrace = state => state.trace;

/**
 * Helper function to help use calculate what percentage of the total duration
 * a service has been in the trace.
 */
export function calculatePercentOfTotal(timestamps) {
  const timestampsByStartTime = sortBy(timestamps, t => t[0]);
  let lastTimestamp;
  const duration = timestampsByStartTime.reduce(
    (lastDuration, t) => {
      let newDuration;
      if (lastTimestamp >= t[1]) {
        newDuration = lastDuration;
      } else if (lastTimestamp > t[0] && lastTimestamp < t[1]) {
        newDuration = lastDuration + (t[1] - lastTimestamp);
        lastTimestamp = t[1];
      } else {
        newDuration = lastDuration + (t[1] - t[0]);
        lastTimestamp = t[1];
      }
      return newDuration;
    },
    0
  );
  return duration;
}

export function transformTrace(trace) {
  const processes = trace.processes || {};
  const processMap = {};
  if (trace.spans && trace.spans.length) {
    trace.spans.forEach(span => {
      if (!span.startTime || !span.duration) {
        return;
      }
      const processName = processes[span.processID].serviceName;
      if (!processMap[processName]) {
        processMap[processName] = [];
      }
      processMap[processName].push([
        span.startTime,
        span.startTime + span.duration,
      ]);
    });
  }

  const traceDuration = getTraceDuration(trace);
  const services = Object.keys(processMap).map(processName => {
    const timestamps = processMap[processName];
    return {
      name: processName,
      numberOfApperancesInTrace: timestamps.length,
      percentOfTrace: Math.round(
        getPercentageOfDuration(
          calculatePercentOfTotal(timestamps),
          traceDuration
        ),
        -1
      ),
    };
  });

  const isErredTag = ({ key, value }) => key === 'error' && value === true;
  const numberOfErredSpans = trace.spans.reduce(
    (total, { tags }) => total + Number(tags.some(isErredTag)),
    0
  );

  return {
    traceName: getTraceName(trace),
    traceID: trace.traceID,
    numberOfSpans: trace.spans.length,
    duration: traceDuration / 1000,
    timestamp: Math.floor(getTraceTimestamp(trace) / 1000),
    numberOfErredSpans,
    services,
  };
}

export const transformTraceSelector = createSelector(getTrace, transformTrace);

export function transformTraceResults(rawTraces) {
  let maxDuration = 0;
  const traces = rawTraces.map(trace => {
    const transformedTrace = transformTraceSelector({ trace });
    // Caluculate max duration of traces.
    if (transformedTrace.duration > maxDuration) {
      maxDuration = transformedTrace.duration;
    }
    return transformedTrace;
  });
  return {
    traces,
    maxDuration,
  };
}
export const transformTraceResultsSelector = createSelector(getTraces, traces =>
  transformTraceResults(traces));

// Sorting options
export const MOST_RECENT = 'MOST_RECENT';
export const LONGEST_FIRST = 'LONGEST_FIRST';
export const SHORTEST_FIRST = 'SHORTEST_FIRST';
export const MOST_SPANS = 'MOST_SPANS';
export const LEAST_SPANS = 'LEAST_SPANS';
export function getSortedTraceResults(traces, sortByFilter) {
  return traces.sort((t1, t2) => {
    switch (sortByFilter) {
      case MOST_RECENT:
        return t2.timestamp - t1.timestamp;
      case SHORTEST_FIRST:
        return t1.duration - t2.duration;
      case MOST_SPANS:
        return t2.numberOfSpans - t1.numberOfSpans;
      case LEAST_SPANS:
        return t1.numberOfSpans - t2.numberOfSpans;
      case LONGEST_FIRST:
      default:
        return t2.duration - t1.duration;
    }
  });
}
