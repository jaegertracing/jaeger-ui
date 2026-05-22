// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { LEAST_SPANS, LONGEST_FIRST, MOST_RECENT, MOST_SPANS, SHORTEST_FIRST } from './order-by';

import type { IOtelTrace } from '../types/otel';

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
