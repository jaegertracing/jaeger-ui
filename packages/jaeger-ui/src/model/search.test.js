// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _maxBy from 'lodash/maxBy';
import _minBy from 'lodash/minBy';

import * as orderBy from './order-by';
import { sortTraces, sortTraceSummaries, toOrderBy, fromOrderBy } from './search';
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

  const { MOST_SPANS, LEAST_SPANS, LONGEST_FIRST, SHORTEST_FIRST, MOST_RECENT, OLDEST_FIRST } = orderBy;

  const expecations = {
    [MOST_RECENT]: _maxBy(traces, trace => trace.startTime).traceID,
    [OLDEST_FIRST]: _minBy(traces, trace => trace.startTime).traceID,
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

describe('sortTraceSummaries()', () => {
  const {
    MOST_SPANS,
    LEAST_SPANS,
    LONGEST_FIRST,
    SHORTEST_FIRST,
    MOST_RECENT,
    OLDEST_FIRST,
    TRACE_NAME_ASC,
    TRACE_NAME_DESC,
    MOST_ERRORS,
    LEAST_ERRORS,
  } = orderBy;

  const makeSummary = (
    traceID,
    startTime,
    duration,
    spanCount,
    traceName = 'svc: op',
    errorSpanCount = 0
  ) => ({
    traceID,
    traceName,
    rootServiceName: 'svc',
    rootOperationName: 'op',
    startTime,
    duration,
    spanCount,
    errorSpanCount,
    orphanSpanCount: 0,
    services: [],
  });

  const summaries = [
    makeSummary('a', 100, 300, 10, 'beta', 3),
    makeSummary('b', 400, 100, 50, 'alpha', 0),
    makeSummary('c', 200, 500, 5, 'delta', 7),
    makeSummary('d', 300, 200, 1, 'gamma', 1),
  ];

  it('returns a sorted copy without mutating the original array', () => {
    const copy = [...summaries];
    sortTraceSummaries(summaries, LONGEST_FIRST);
    expect(summaries).toEqual(copy);
  });

  it(`sorts by ${MOST_RECENT}`, () => {
    const result = sortTraceSummaries(summaries, MOST_RECENT);
    expect(result[0].traceID).toBe('b'); // startTime 400
  });

  it(`sorts by ${OLDEST_FIRST}`, () => {
    const result = sortTraceSummaries(summaries, OLDEST_FIRST);
    expect(result[0].traceID).toBe('a'); // startTime 100 → oldest
  });

  it(`sorts by ${LONGEST_FIRST}`, () => {
    const result = sortTraceSummaries(summaries, LONGEST_FIRST);
    expect(result[0].traceID).toBe('c'); // duration 500
  });

  it(`sorts by ${SHORTEST_FIRST}`, () => {
    const result = sortTraceSummaries(summaries, SHORTEST_FIRST);
    expect(result[0].traceID).toBe('b'); // duration 100
  });

  it(`sorts by ${MOST_SPANS}`, () => {
    const result = sortTraceSummaries(summaries, MOST_SPANS);
    expect(result[0].traceID).toBe('b'); // spanCount 50
  });

  it(`sorts by ${LEAST_SPANS}`, () => {
    const result = sortTraceSummaries(summaries, LEAST_SPANS);
    expect(result[0].traceID).toBe('d'); // spanCount 1
  });

  it(`sorts by ${TRACE_NAME_ASC}`, () => {
    const result = sortTraceSummaries(summaries, TRACE_NAME_ASC);
    expect(result[0].traceID).toBe('b'); // traceName 'alpha'
  });

  it(`sorts by ${TRACE_NAME_DESC}`, () => {
    const result = sortTraceSummaries(summaries, TRACE_NAME_DESC);
    expect(result[0].traceID).toBe('d'); // traceName 'gamma'
  });

  it('sorts trace names using the same traceID fallback shown in the table', () => {
    const result = sortTraceSummaries(
      [
        makeSummary('z-trace', 100, 300, 10, ''),
        makeSummary('alpha-trace', 400, 100, 50, ''),
        makeSummary('named-trace', 200, 500, 5, 'beta'),
      ],
      TRACE_NAME_ASC
    );
    expect(result.map(summary => summary.traceID)).toEqual(['alpha-trace', 'named-trace', 'z-trace']);
  });

  it(`sorts by ${MOST_ERRORS}`, () => {
    const result = sortTraceSummaries(summaries, MOST_ERRORS);
    expect(result[0].traceID).toBe('c'); // errorSpanCount 7
  });

  it(`sorts by ${LEAST_ERRORS}`, () => {
    const result = sortTraceSummaries(summaries, LEAST_ERRORS);
    expect(result[0].traceID).toBe('b'); // errorSpanCount 0
  });

  it('falls back to LONGEST_FIRST for unknown sort key', () => {
    const result = sortTraceSummaries(summaries, 'unknown');
    expect(result[0].traceID).toBe('c'); // duration 500
  });

  it('falls back to LONGEST_FIRST for inherited property names', () => {
    const result = sortTraceSummaries(summaries, 'toString');
    expect(result[0].traceID).toBe('c'); // duration 500
  });
});
