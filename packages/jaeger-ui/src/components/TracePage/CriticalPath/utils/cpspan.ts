// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, SpanKind } from '../../../../types/otel';
import { CPSpan } from '../../../../types/critical_path';

/**
 * Determines if a span is blocking based on its kind.
 * Producer and Consumer spans are non-blocking (async messaging patterns).
 * Internal, Client, and Server spans are blocking.
 */
function isBlockingSpan(kind: SpanKind): boolean {
  return kind !== SpanKind.PRODUCER && kind !== SpanKind.CONSUMER;
}

/**
 * Creates a CPSpan object from an IOtelSpan for use in critical path computation.
 * This function creates defensive copies of arrays to prevent mutation of the original trace.
 *
 * @param span - The IOtelSpan object from the trace
 * @returns A CPSpan object with copied data
 */
export function createCPSpan(span: IOtelSpan): CPSpan {
  return {
    spanID: span.spanID,
    parentSpanID: span.parentSpanID,
    isBlocking: isBlockingSpan(span.kind),
    startTime: span.startTimeUnixMicros,
    duration: span.durationMicros,
    childSpanIDs: span.childSpans.map(s => s.spanID),
  };
}

/**
 * Creates a Map of CPSpan objects from an array of IOtelSpan objects.
 *
 * @param spans - Array of IOtelSpan objects from the trace
 * @returns A Map with spanID as key and CPSpan as value
 */
export function createCPSpanMap(spans: ReadonlyArray<IOtelSpan>): Map<string, CPSpan> {
  return spans.reduce((map, span) => {
    map.set(span.spanID, createCPSpan(span));
    return map;
  }, new Map<string, CPSpan>());
}
