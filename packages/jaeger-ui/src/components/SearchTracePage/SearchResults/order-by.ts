// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export const MOST_RECENT = 'MOST_RECENT';
export const LONGEST_FIRST = 'LONGEST_FIRST';
export const SHORTEST_FIRST = 'SHORTEST_FIRST';
export const MOST_SPANS = 'MOST_SPANS';
export const LEAST_SPANS = 'LEAST_SPANS';
export const OLDEST_FIRST = 'OLDEST_FIRST';
export const TRACE_NAME_ASC = 'TRACE_NAME_ASC';
export const TRACE_NAME_DESC = 'TRACE_NAME_DESC';
export const MOST_ERRORS = 'MOST_ERRORS';
export const LEAST_ERRORS = 'LEAST_ERRORS';

export type OrderBy =
  | typeof MOST_RECENT
  | typeof LONGEST_FIRST
  | typeof SHORTEST_FIRST
  | typeof MOST_SPANS
  | typeof LEAST_SPANS
  | typeof OLDEST_FIRST
  | typeof TRACE_NAME_ASC
  | typeof TRACE_NAME_DESC
  | typeof MOST_ERRORS
  | typeof LEAST_ERRORS;

export type TraceOrderBy =
  | typeof MOST_RECENT
  | typeof OLDEST_FIRST
  | typeof SHORTEST_FIRST
  | typeof LONGEST_FIRST
  | typeof MOST_SPANS
  | typeof LEAST_SPANS;

const ORDER_BY_VALUES: ReadonlySet<string> = new Set([
  MOST_RECENT,
  LONGEST_FIRST,
  SHORTEST_FIRST,
  MOST_SPANS,
  LEAST_SPANS,
  OLDEST_FIRST,
  TRACE_NAME_ASC,
  TRACE_NAME_DESC,
  MOST_ERRORS,
  LEAST_ERRORS,
]);

export function isValidOrderBy(value: unknown): value is OrderBy {
  return typeof value === 'string' && ORDER_BY_VALUES.has(value);
}
