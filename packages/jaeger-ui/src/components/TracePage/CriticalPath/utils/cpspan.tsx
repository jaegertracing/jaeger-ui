// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { CPSpan, CPSpanReference, Span } from '../../../../types/trace';

/**
 * Creates a CPSpan object from a Span object for use in critical path computation.
 * This function creates defensive copies of arrays to prevent mutation of the original trace.
 *
 * @param span - The original Span object from the trace
 * @returns A CPSpan object with copied data
 */
export function createCPSpan(span: Span): CPSpan {
  return {
    spanID: span.spanID,
    startTime: span.startTime,
    duration: span.duration,
    references: span.references.map(
      (ref): CPSpanReference => ({
        refType: ref.refType,
        spanID: ref.spanID,
        traceID: ref.traceID,
        span: undefined,
      })
    ),
    childSpanIds: span.childSpans.map(s => s.spanID),
  };
}

/**
 * Creates a Map of CPSpan objects from an array of Span objects.
 *
 * @param spans - Array of Span objects from the trace
 * @returns A Map with spanID as key and CPSpan as value
 */
export function createCPSpanMap(spans: ReadonlyArray<Span>): Map<string, CPSpan> {
  return spans.reduce((map, span) => {
    map.set(span.spanID, createCPSpan(span));
    return map;
  }, new Map<string, CPSpan>());
}
