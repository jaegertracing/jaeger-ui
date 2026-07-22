// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  isValidOrderBy,
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
} from './order-by';

describe('isValidOrderBy', () => {
  it.each([
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
  ])('accepts %s as a valid OrderBy value', value => {
    expect(isValidOrderBy(value)).toBe(true);
  });

  it('rejects an unknown string', () => {
    expect(isValidOrderBy('NOT_A_REAL_ORDER')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidOrderBy(undefined)).toBe(false);
    expect(isValidOrderBy(null)).toBe(false);
    expect(isValidOrderBy(42)).toBe(false);
  });
});
