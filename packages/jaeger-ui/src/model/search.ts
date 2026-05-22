// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { LEAST_SPANS, LONGEST_FIRST, MOST_RECENT, MOST_SPANS, SHORTEST_FIRST } from './order-by';

import type { IOtelTrace } from '../types/otel';
import type { TraceSummary } from '../types/trace-summary';

type ISortable = { startTime: number; duration: number; spanCount: number };

const comparators: Record<string, (a: ISortable, b: ISortable) => number> = {
  [MOST_RECENT]: (a, b) => b.startTime - a.startTime,
  [SHORTEST_FIRST]: (a, b) => a.duration - b.duration,
  [LONGEST_FIRST]: (a, b) => b.duration - a.duration,
  [MOST_SPANS]: (a, b) => b.spanCount - a.spanCount,
  [LEAST_SPANS]: (a, b) => a.spanCount - b.spanCount,
};

/**
 * Sorts traces in place.
 *
 * @param  traces The trace array to sort.
 * @param  sortBy A sort specification, see ./order-by.js.
 */
export function sortTraces(traces: IOtelTrace[], sortBy: string) {
  const comparator = comparators[sortBy] || comparators[LONGEST_FIRST];
  const toSortable = (t: IOtelTrace): ISortable => ({
    startTime: t.startTime,
    duration: t.duration,
    spanCount: t.spans.length,
  });
  traces.sort((a, b) => comparator(toSortable(a), toSortable(b)));
}

/**
 * Returns a sorted copy of `TraceSummary[]`.
 */
export function sortTraceSummaries(traces: TraceSummary[], sortBy: string): TraceSummary[] {
  const comparator = comparators[sortBy] || comparators[LONGEST_FIRST];
  return [...traces].sort(comparator);
}
