// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as orderBy from './order-by';
import { sortTraceSummaries } from './sort';
import type { TraceSummary } from '../../../types/trace-summary';

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
    traceID: string,
    startTime: number,
    duration: number,
    spanCount: number,
    traceName = 'svc: op',
    errorSpanCount = 0
  ) =>
    ({
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
    }) as unknown as TraceSummary;

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
    const result = sortTraceSummaries(summaries, 'unknown' as unknown as orderBy.OrderBy);
    expect(result[0].traceID).toBe('c'); // duration 500
  });

  it('falls back to LONGEST_FIRST for inherited property names', () => {
    const result = sortTraceSummaries(summaries, 'toString' as unknown as orderBy.OrderBy);
    expect(result[0].traceID).toBe('c'); // duration 500
  });
});
