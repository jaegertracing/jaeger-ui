// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export enum OrderBy {
  MOST_RECENT = 'MOST_RECENT',
  LONGEST_FIRST = 'LONGEST_FIRST',
  SHORTEST_FIRST = 'SHORTEST_FIRST',
  MOST_SPANS = 'MOST_SPANS',
  LEAST_SPANS = 'LEAST_SPANS',
  OLDEST_FIRST = 'OLDEST_FIRST',
  TRACE_NAME_ASC = 'TRACE_NAME_ASC',
  TRACE_NAME_DESC = 'TRACE_NAME_DESC',
  MOST_ERRORS = 'MOST_ERRORS',
  LEAST_ERRORS = 'LEAST_ERRORS',
}

export type TraceOrderBy =
  | OrderBy.MOST_RECENT
  | OrderBy.OLDEST_FIRST
  | OrderBy.SHORTEST_FIRST
  | OrderBy.LONGEST_FIRST
  | OrderBy.MOST_SPANS
  | OrderBy.LEAST_SPANS;

// Re-export individual constants for backward compatibility with
// `import * as orderBy from './order-by'` call sites.
export const MOST_RECENT = OrderBy.MOST_RECENT;
export const LONGEST_FIRST = OrderBy.LONGEST_FIRST;
export const SHORTEST_FIRST = OrderBy.SHORTEST_FIRST;
export const MOST_SPANS = OrderBy.MOST_SPANS;
export const LEAST_SPANS = OrderBy.LEAST_SPANS;
export const OLDEST_FIRST = OrderBy.OLDEST_FIRST;
export const TRACE_NAME_ASC = OrderBy.TRACE_NAME_ASC;
export const TRACE_NAME_DESC = OrderBy.TRACE_NAME_DESC;
export const MOST_ERRORS = OrderBy.MOST_ERRORS;
export const LEAST_ERRORS = OrderBy.LEAST_ERRORS;
