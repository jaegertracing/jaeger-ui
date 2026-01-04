// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, SpanKind } from '../../../../types/otel';
import { CPSpan } from '../../../../types/critical_path';

/**
 * Determines if a span is blocking from its parent perspective.
 * Since OpenTelemetry does not have a blocking/non-blocking indicator,
 * we only consider child non-blocking in a producer/consumer relationship.
 */
function isBlockingSpan(childKind: SpanKind, parentKind?: SpanKind): boolean {
  return !(parentKind === SpanKind.PRODUCER && childKind === SpanKind.CONSUMER);
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
    isBlocking: isBlockingSpan(span.kind, span.parentSpan?.kind),
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
