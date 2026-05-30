// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  LEAST_ERRORS,
  LEAST_SPANS,
  LONGEST_FIRST,
  MOST_ERRORS,
  MOST_RECENT,
  MOST_SPANS,
  OLDEST_FIRST,
  SHORTEST_FIRST,
  TRACE_NAME_ASC,
  TRACE_NAME_DESC,
} from './order-by';

import type { IOtelTrace } from '../types/otel';
import type { TraceSummary } from '../types/trace-summary';

type ISortableTrace = Pick<IOtelTrace, 'startTime' | 'duration' | 'spans'>;

const comparators: Record<string, (a: ISortableTrace, b: ISortableTrace) => number> = {
  [MOST_RECENT]: (a, b) => +(b.startTime > a.startTime) || +(a.startTime === b.startTime) - 1,
  [SHORTEST_FIRST]: (a, b) => +(a.duration > b.duration) || +(a.duration === b.duration) - 1,
  [LONGEST_FIRST]: (a, b) => +(b.duration > a.duration) || +(a.duration === b.duration) - 1,
  [MOST_SPANS]: (a, b) => +(b.spans.length > a.spans.length) || +(a.spans.length === b.spans.length) - 1,
  [LEAST_SPANS]: (a, b) => +(a.spans.length > b.spans.length) || +(a.spans.length === b.spans.length) - 1,
};

/**
 * Sorts traces in place.
 *
 * @param  {ISortableTrace[]} traces The trace array to sort.
 * @param  {string} sortBy A sort specification, see ./order-by.js.
 */
export function sortTraces(traces: ISortableTrace[], sortBy: string) {
  const comparator = comparators[sortBy] || comparators[LONGEST_FIRST];
  traces.sort(comparator);
}

const summaryComparators: Record<string, (a: TraceSummary, b: TraceSummary) => number> = {
  [MOST_RECENT]: (a, b) => +(b.startTime > a.startTime) || +(a.startTime === b.startTime) - 1,
  [OLDEST_FIRST]: (a, b) => +(a.startTime > b.startTime) || +(a.startTime === b.startTime) - 1,
  [SHORTEST_FIRST]: (a, b) => +(a.duration > b.duration) || +(a.duration === b.duration) - 1,
  [LONGEST_FIRST]: (a, b) => +(b.duration > a.duration) || +(a.duration === b.duration) - 1,
  [MOST_SPANS]: (a, b) =>
    +((b.spanCount ?? 0) > (a.spanCount ?? 0)) || +((a.spanCount ?? 0) === (b.spanCount ?? 0)) - 1,
  [LEAST_SPANS]: (a, b) =>
    +((a.spanCount ?? 0) > (b.spanCount ?? 0)) || +((a.spanCount ?? 0) === (b.spanCount ?? 0)) - 1,
  [TRACE_NAME_ASC]: (a, b) => a.traceName.localeCompare(b.traceName),
  [TRACE_NAME_DESC]: (a, b) => b.traceName.localeCompare(a.traceName),
  [MOST_ERRORS]: (a, b) =>
    +(b.errorSpanCount > a.errorSpanCount) || +(a.errorSpanCount === b.errorSpanCount) - 1,
  [LEAST_ERRORS]: (a, b) =>
    +(a.errorSpanCount > b.errorSpanCount) || +(a.errorSpanCount === b.errorSpanCount) - 1,
};

/**
 * Returns a sorted copy of `TraceSummary[]`.
 */
export function sortTraceSummaries(traces: TraceSummary[], sortBy: string): TraceSummary[] {
  const comparator = summaryComparators[sortBy] || summaryComparators[LONGEST_FIRST];
  return [...traces].sort(comparator);
}
