// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { SearchQuery } from '../types/search';

function eqEq(a: string | number | null | undefined, b: string | number | null | undefined) {
  return (a == null && b == null) || String(a) === String(b);
}

export function isSameQuery(a: SearchQuery | null | undefined, b: SearchQuery | null | undefined): boolean {
  if (!a || !b) return a === b;
  return (
    eqEq(a.end, b.end) &&
    eqEq(a.limit, b.limit) &&
    eqEq(a.lookback, b.lookback) &&
    eqEq(a.maxDuration, b.maxDuration) &&
    eqEq(a.minDuration, b.minDuration) &&
    eqEq(a.operation, b.operation) &&
    eqEq(a.service, b.service) &&
    eqEq(a.start, b.start) &&
    eqEq(a.tags, b.tags)
  );
}

/** Returns true when none of the meaningful search fields are set. */
export function isQueryEmpty(q: SearchQuery): boolean {
  return !q.service && !q.start && !q.end;
}
