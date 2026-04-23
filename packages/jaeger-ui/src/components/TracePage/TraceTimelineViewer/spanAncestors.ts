// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan } from '../../../types/otel';
import colorGenerator from '../../../utils/color-generator';
import { SpanAncestorEntry } from './SpanTreeOffset';

/**
 * Walks the parentSpan chain starting from `immediateParent` and returns one
 * SpanAncestorEntry per ancestor depth (outermost first, immediate parent last).
 *
 * For non-immediate ancestors: color is null when that ancestor has no further
 * siblings below it (i.e. its descendant in the chain is its last child),
 * meaning no vertical bar should be drawn at that depth.
 * The immediate parent entry always carries a color since the horizontal
 * connector must be rendered regardless.
 */
export function computeSpanAncestors(immediateParent: IOtelSpan): SpanAncestorEntry[] {
  const chain: IOtelSpan[] = [];
  let current: IOtelSpan | undefined = immediateParent;
  while (current) {
    chain.unshift(current);
    current = current.parentSpan;
  }

  return chain.map((ancestor, i) => {
    const isImmediate = i === chain.length - 1;
    if (isImmediate) {
      return { id: ancestor.spanID, color: colorGenerator.getColorByKey(ancestor.resource.serviceName) };
    }
    const next = chain[i + 1];
    const terminated = ancestor.childSpans[ancestor.childSpans.length - 1]?.spanID === next.spanID;
    return {
      id: ancestor.spanID,
      color: terminated ? null : colorGenerator.getColorByKey(ancestor.resource.serviceName),
    };
  });
}
