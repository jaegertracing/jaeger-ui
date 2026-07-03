// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  LONGEST_FIRST,
  LEAST_ERRORS,
  LEAST_SPANS,
  MOST_ERRORS,
  MOST_RECENT,
  MOST_SPANS,
  OLDEST_FIRST,
  SHORTEST_FIRST,
  TRACE_NAME_ASC,
  TRACE_NAME_DESC,
} from './order-by';
import type { OrderBy } from './order-by';

import type { TraceSummary } from '../../../types/trace-summary';

function getDisplayedTraceName(summary: TraceSummary) {
  return summary.traceName || summary.traceID;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled OrderBy value: ${String(value)}`);
}

const summaryComparators: Record<OrderBy, (a: TraceSummary, b: TraceSummary) => number> = {
  [MOST_RECENT]: (a, b) => b.startTime - a.startTime,
  [OLDEST_FIRST]: (a, b) => a.startTime - b.startTime,
  [SHORTEST_FIRST]: (a, b) => a.duration - b.duration,
  [LONGEST_FIRST]: (a, b) => b.duration - a.duration,
  [MOST_SPANS]: (a, b) => (b.spanCount ?? 0) - (a.spanCount ?? 0),
  [LEAST_SPANS]: (a, b) => (a.spanCount ?? 0) - (b.spanCount ?? 0),
  [TRACE_NAME_ASC]: (a, b) => getDisplayedTraceName(a).localeCompare(getDisplayedTraceName(b)),
  [TRACE_NAME_DESC]: (a, b) => getDisplayedTraceName(b).localeCompare(getDisplayedTraceName(a)),
  [MOST_ERRORS]: (a, b) => (b.errorSpanCount ?? 0) - (a.errorSpanCount ?? 0),
  [LEAST_ERRORS]: (a, b) => (a.errorSpanCount ?? 0) - (b.errorSpanCount ?? 0),
};

function getSummaryComparator(sortBy: OrderBy) {
  if (Object.hasOwn(summaryComparators, sortBy)) {
    return summaryComparators[sortBy];
  }
  return summaryComparators[LONGEST_FIRST];
}

/**
 * Returns a sorted copy of `TraceSummary[]`.
 */
export function sortTraceSummaries(traces: TraceSummary[], sortBy: OrderBy): TraceSummary[] {
  const comparator = getSummaryComparator(sortBy);
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
  if (order == null) return MOST_RECENT;
  if (columnKey === 'traceName') {
    return order === 'ascend' ? TRACE_NAME_ASC : TRACE_NAME_DESC;
  }
  if (columnKey === 'spans') {
    return order === 'ascend' ? LEAST_SPANS : MOST_SPANS;
  }
  if (columnKey === 'errors') {
    return order === 'ascend' ? LEAST_ERRORS : MOST_ERRORS;
  }
  if (columnKey === 'duration') {
    return order === 'ascend' ? SHORTEST_FIRST : LONGEST_FIRST;
  }
  if (columnKey === 'startTime') {
    return order === 'ascend' ? OLDEST_FIRST : MOST_RECENT;
  }
  return MOST_RECENT;
}

/**
 * Maps an `OrderBy` value back to a column key + sort direction for the table view.
 */
export function fromOrderBy(sort: OrderBy): { key: SortableColumnKey; order: SortDirection } {
  switch (sort) {
    case MOST_RECENT:
      return { key: 'startTime', order: 'descend' };
    case TRACE_NAME_ASC:
      return { key: 'traceName', order: 'ascend' };
    case TRACE_NAME_DESC:
      return { key: 'traceName', order: 'descend' };
    case MOST_SPANS:
      return { key: 'spans', order: 'descend' };
    case LEAST_SPANS:
      return { key: 'spans', order: 'ascend' };
    case MOST_ERRORS:
      return { key: 'errors', order: 'descend' };
    case LEAST_ERRORS:
      return { key: 'errors', order: 'ascend' };
    case LONGEST_FIRST:
      return { key: 'duration', order: 'descend' };
    case SHORTEST_FIRST:
      return { key: 'duration', order: 'ascend' };
    case OLDEST_FIRST:
      return { key: 'startTime', order: 'ascend' };
  }
  return assertNever(sort);
}
