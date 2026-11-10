// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// This module decides which spans the trace view hides. The timeline consumes the result as a set
// of span IDs, so that the row generation, the critical path and the search match count do not
// need to know which criterion hid a span. The service filter from ADR-0009 is the only criterion.

import { TNil } from '../../types';
import { IOtelSpan } from '../../types/otel';

const NO_SPANS: ReadonlySet<string> = new Set();

/**
 * Returns the IDs of every span that the service filter hides: each span whose service is pruned,
 * and every descendant of such a span, because the filter removes whole subtrees. The spans must
 * be in pre-order, which transform-trace-data.ts guarantees, so that a parent is decided before
 * its children. The result is derived from the trace at hand rather than stored, so a caller that
 * holds a different or newer trace than the timeline never sees a stale set.
 */
export function hiddenSpanIDsForServices(
  spans: ReadonlyArray<IOtelSpan> | TNil,
  prunedServices: ReadonlySet<string>
): ReadonlySet<string> {
  if (!spans || prunedServices.size === 0) return NO_SPANS;
  const hidden = new Set<string>();
  for (const span of spans) {
    const parentHidden = span.parentSpan ? hidden.has(span.parentSpan.spanID) : false;
    if (parentHidden || prunedServices.has(span.resource.serviceName)) {
      hidden.add(span.spanID);
    }
  }
  return hidden;
}

/**
 * Removes the hidden spans from a set of span IDs, so that the search match count and the
 * highlighting never refer to a span that is not on screen. Returns null when nothing is left.
 */
export function withoutHiddenSpans(
  spanIDs: ReadonlySet<string> | TNil,
  hiddenIDs: ReadonlySet<string>
): Set<string> | TNil {
  if (!spanIDs || hiddenIDs.size === 0) return spanIDs as Set<string> | TNil;
  const visible = new Set<string>();
  for (const id of spanIDs) {
    if (!hiddenIDs.has(id)) visible.add(id);
  }
  return visible.size > 0 ? visible : null;
}
