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
    startTime: span.startTime,
    endTime: span.endTime,
    duration: span.duration,
    childSpanIDs: [], // populated during traversal
  };
}

/**
 * Iteratively builds a map of CPSpan objects starting from a root span.
 * Only blocking spans and their descendants are included in the map.
 * Non-blocking branches are pruned during traversal.
 *
 * @param rootSpan - The IOtelSpan to start traversal from.
 * @returns A Map with spanID as key and CPSpan as value.
 */
export function createCPSpanMap(rootSpan: IOtelSpan): Map<string, CPSpan> {
  const spanMap = new Map<string, CPSpan>();
  const stack: IOtelSpan[] = [rootSpan];

  while (stack.length > 0) {
    const span = stack.pop()!;
    if (spanMap.has(span.spanID)) continue;

    const cpSpan = createCPSpan(span);
    spanMap.set(span.spanID, cpSpan);

    // Collect blocking children in forward order, then push to stack in reverse
    // so they pop left-to-right (preserving original DFS traversal order).
    const blockingChildren: IOtelSpan[] = [];
    for (let i = 0; i < span.childSpans.length; i++) {
      const child = span.childSpans[i];
      // A child is blocking if it's NOT a PRODUCER -> CONSUMER relationship.
      // THE ROOT SPAN ITSELF IS ALWAYS CONSIDERED BLOCKING (handled by start of traversal).
      if (isBlockingSpan(child.kind, span.kind)) {
        blockingChildren.push(child);
      }
    }

    // Populate childSpanIDs in forward order
    for (const child of blockingChildren) {
      cpSpan.childSpanIDs.push(child.spanID);
    }

    // Push to stack in reverse order for left-to-right DFS
    for (let i = blockingChildren.length - 1; i >= 0; i--) {
      stack.push(blockingChildren[i]);
    }
  }

  return spanMap;
}
