// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { LEAST_SPANS, LONGEST_FIRST, MOST_RECENT, MOST_SPANS, SHORTEST_FIRST } from './order-by';

import { Trace } from '../types/trace';

const comparators: Record<string, (a: Trace, b: Trace) => number> = {
  [MOST_RECENT]: (a, b) => +(b.startTime > a.startTime) || +(a.startTime === b.startTime) - 1,
  [SHORTEST_FIRST]: (a, b) => +(a.duration > b.duration) || +(a.duration === b.duration) - 1,
  [LONGEST_FIRST]: (a, b) => +(b.duration > a.duration) || +(a.duration === b.duration) - 1,
  [MOST_SPANS]: (a, b) => +(b.spans.length > a.spans.length) || +(a.spans.length === b.spans.length) - 1,
  [LEAST_SPANS]: (a, b) => +(a.spans.length > b.spans.length) || +(a.spans.length === b.spans.length) - 1,
};

/**
 * Sorts `Trace[]`, in place.
 *
 * @param  {Trace[]} traces The `Trace` array to sort.
 * @param  {string} sortBy A sort specification, see ./order-by.js.
 */

export function sortTraces(traces: Trace[], sortBy: string) {
  const comparator = comparators[sortBy] || comparators[LONGEST_FIRST];
  traces.sort(comparator);
}
