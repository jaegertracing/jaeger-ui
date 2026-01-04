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
 * Creates a CPSpan object from an IOtelSpan.
 */
export function createCPSpan(span: IOtelSpan): CPSpan {
  return {
    spanID: span.spanID,
    parentSpanID: span.parentSpanID,
    isBlocking: isBlockingSpan(span.kind, span.parentSpan?.kind),
    startTime: span.startTimeUnixMicros,
    duration: span.durationMicros,
    childSpanIDs: [], // populated during traversal
  };
}

/**
 * Recursively builds a map of CPSpan objects starting from a root span.
 * Only blocking spans and their descendants are included in the map.
 * Non-blocking branches are pruned during traversal.
 *
 * @param rootSpan - The IOtelSpan to start traversal from.
 * @returns A Map with spanID as key and CPSpan as value.
 */
export function createCPSpanMap(rootSpan: IOtelSpan): Map<string, CPSpan> {
  const spanMap = new Map<string, CPSpan>();

  const traverse = (span: IOtelSpan) => {
    const cpSpan = createCPSpan(span);
    spanMap.set(span.spanID, cpSpan);

    span.childSpans.forEach(child => {
      // A child is blocking if it's NOT a PRODUCER -> CONSUMER relationship.
      // THE ROOT SPAN ITSELF IS ALWAYS CONSIDERED BLOCKING (already handled by start of traversal).
      if (isBlockingSpan(child.kind, span.kind)) {
        cpSpan.childSpanIDs.push(child.spanID);
        traverse(child);
      }
    });
  };

  traverse(rootSpan);
  return spanMap;
}
