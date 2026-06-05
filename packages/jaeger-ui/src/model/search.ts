// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { OrderBy, TraceOrderBy } from './order-by';

import type { IOtelTrace } from '../types/otel';
import type { TraceSummary } from '../types/trace-summary';

type ISortableTrace = Pick<IOtelTrace, 'startTime' | 'duration' | 'spans'>;

const comparators: Record<TraceOrderBy, (a: ISortableTrace, b: ISortableTrace) => number> = {
  [OrderBy.MOST_RECENT]: (a, b) => b.startTime - a.startTime,
  [OrderBy.OLDEST_FIRST]: (a, b) => a.startTime - b.startTime,
  [OrderBy.SHORTEST_FIRST]: (a, b) => a.duration - b.duration,
  [OrderBy.LONGEST_FIRST]: (a, b) => b.duration - a.duration,
  [OrderBy.MOST_SPANS]: (a, b) => b.spans.length - a.spans.length,
  [OrderBy.LEAST_SPANS]: (a, b) => a.spans.length - b.spans.length,
};

/**
 * Sorts traces in place.
 *
 * @param  {ISortableTrace[]} traces The trace array to sort.
 * @param  {TraceOrderBy} sortBy A sort specification, see ./order-by.ts.
 */
export function sortTraces(traces: ISortableTrace[], sortBy: TraceOrderBy) {
  const comparator = comparators[sortBy] || comparators[OrderBy.LONGEST_FIRST];
  traces.sort(comparator);
}

const summaryComparators: Record<OrderBy, (a: TraceSummary, b: TraceSummary) => number> = {
  [OrderBy.MOST_RECENT]: (a, b) => b.startTime - a.startTime,
  [OrderBy.OLDEST_FIRST]: (a, b) => a.startTime - b.startTime,
  [OrderBy.SHORTEST_FIRST]: (a, b) => a.duration - b.duration,
  [OrderBy.LONGEST_FIRST]: (a, b) => b.duration - a.duration,
  [OrderBy.MOST_SPANS]: (a, b) => (b.spanCount ?? 0) - (a.spanCount ?? 0),
  [OrderBy.LEAST_SPANS]: (a, b) => (a.spanCount ?? 0) - (b.spanCount ?? 0),
  [OrderBy.TRACE_NAME_ASC]: (a, b) => a.traceName.localeCompare(b.traceName),
  [OrderBy.TRACE_NAME_DESC]: (a, b) => b.traceName.localeCompare(a.traceName),
  [OrderBy.MOST_ERRORS]: (a, b) => (b.errorSpanCount ?? 0) - (a.errorSpanCount ?? 0),
  [OrderBy.LEAST_ERRORS]: (a, b) => (a.errorSpanCount ?? 0) - (b.errorSpanCount ?? 0),
};

/**
 * Returns a sorted copy of `TraceSummary[]`.
 */
export function sortTraceSummaries(traces: TraceSummary[], sortBy: OrderBy | string): TraceSummary[] {
  const comparator = summaryComparators[sortBy as OrderBy] || summaryComparators[OrderBy.LONGEST_FIRST];
  return [...traces].sort(comparator);
}

/** Column keys used by the table view that map to OrderBy values. */
export type SortableColumnKey = 'traceName' | 'spans' | 'errors' | 'duration' | 'startTime';

/** Ant Design sort direction. */
export type SortDirection = 'ascend' | 'descend';

/**
 * Maps an Ant Design table column key + sort direction to an `OrderBy` value.
 */
export function toOrderBy(
  columnKey: SortableColumnKey | undefined,
  order: SortDirection | undefined
): OrderBy {
  if (order == null) return OrderBy.MOST_RECENT;
  if (columnKey === 'traceName') {
    return order === 'ascend' ? OrderBy.TRACE_NAME_ASC : OrderBy.TRACE_NAME_DESC;
  }
  if (columnKey === 'spans') {
    return order === 'ascend' ? OrderBy.LEAST_SPANS : OrderBy.MOST_SPANS;
  }
  if (columnKey === 'errors') {
    return order === 'ascend' ? OrderBy.LEAST_ERRORS : OrderBy.MOST_ERRORS;
  }
  if (columnKey === 'duration') {
    return order === 'ascend' ? OrderBy.SHORTEST_FIRST : OrderBy.LONGEST_FIRST;
  }
  if (columnKey === 'startTime') {
    return order === 'ascend' ? OrderBy.OLDEST_FIRST : OrderBy.MOST_RECENT;
  }
  return OrderBy.MOST_RECENT;
}

/**
 * Maps an `OrderBy` value back to a column key + sort direction for the table view.
 */
export function fromOrderBy(sort: OrderBy): { key: SortableColumnKey; order: SortDirection } {
  switch (sort) {
    case OrderBy.TRACE_NAME_ASC:
      return { key: 'traceName', order: 'ascend' };
    case OrderBy.TRACE_NAME_DESC:
      return { key: 'traceName', order: 'descend' };
    case OrderBy.MOST_SPANS:
      return { key: 'spans', order: 'descend' };
    case OrderBy.LEAST_SPANS:
      return { key: 'spans', order: 'ascend' };
    case OrderBy.MOST_ERRORS:
      return { key: 'errors', order: 'descend' };
    case OrderBy.LEAST_ERRORS:
      return { key: 'errors', order: 'ascend' };
    case OrderBy.LONGEST_FIRST:
      return { key: 'duration', order: 'descend' };
    case OrderBy.SHORTEST_FIRST:
      return { key: 'duration', order: 'ascend' };
    case OrderBy.OLDEST_FIRST:
      return { key: 'startTime', order: 'ascend' };
    default:
      return { key: 'startTime', order: 'descend' };
  }
}
