// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  LONGEST_FIRST,
  LEAST_SPANS,
  MOST_RECENT,
  MOST_SPANS,
  OLDEST_FIRST,
  SHORTEST_FIRST,
} from '../components/SearchTracePage/SearchResults/order-by';
import type { TraceOrderBy } from '../components/SearchTracePage/SearchResults/order-by';

import type { IOtelTrace } from '../types/otel';

type ISortableTrace = Pick<IOtelTrace, 'startTime' | 'duration' | 'spans'>;

const comparators: Record<TraceOrderBy, (a: ISortableTrace, b: ISortableTrace) => number> = {
  [MOST_RECENT]: (a, b) => b.startTime - a.startTime,
  [OLDEST_FIRST]: (a, b) => a.startTime - b.startTime,
  [SHORTEST_FIRST]: (a, b) => a.duration - b.duration,
  [LONGEST_FIRST]: (a, b) => b.duration - a.duration,
  [MOST_SPANS]: (a, b) => b.spans.length - a.spans.length,
  [LEAST_SPANS]: (a, b) => a.spans.length - b.spans.length,
};

function getTraceComparator(sortBy: TraceOrderBy) {
  if (Object.hasOwn(comparators, sortBy)) {
    return comparators[sortBy];
  }
  return comparators[LONGEST_FIRST];
}

/**
 * Sorts traces in place.
 *
 * @param  {ISortableTrace[]} traces The trace array to sort.
 * @param  {TraceOrderBy} sortBy A sort specification, see ../components/SearchTracePage/SearchResults/order-by.ts.
 */
export function sortTraces(traces: ISortableTrace[], sortBy: TraceOrderBy) {
  const comparator = getTraceComparator(sortBy);
  traces.sort(comparator);
}
