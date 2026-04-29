// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { AncestorEntry } from './SpanTreeOffset';
import { IOtelSpan } from '../../../types/otel';
import colorGenerator from '../../../utils/color-generator';

/**
 * Walk `span.parentSpan` once to build the ancestor entries array for SpanTreeOffset.
 *
 * Each entry has:
 * - `ancestorId`: the span ID at that depth (for hover-highlight).
 * - `color`: the service color to draw a vertical bar, or `null` when the ancestor's branch
 *   has terminated (the descendant in the chain is the last child of its parent, meaning no
 *   more siblings exist below that depth).
 *
 * The array is ordered outermost → immediate parent.
 */
/**
 * Check if a span is the last child of its parent.
 */
export function computeIsLastChild(span: IOtelSpan): boolean {
  const parent = span.parentSpan;
  if (!parent) return false;
  return parent.childSpans[parent.childSpans.length - 1]?.spanID === span.spanID;
}

export function computeAncestorEntries(span: IOtelSpan): AncestorEntry[] {
  // Build ancestor chain (outermost first)
  const ancestors: IOtelSpan[] = [];
  let current = span.parentSpan;
  while (current) {
    ancestors.unshift(current);
    current = current.parentSpan;
  }

  if (ancestors.length === 0) {
    return [];
  }

  const isLast = computeIsLastChild(span);

  return ancestors.map((ancestor, index) => {
    const guideColor = colorGenerator.getColorByKey(ancestor.resource.serviceName);
    const isLastAncestor = index === ancestors.length - 1;

    let shouldTerminate = false;
    if (isLastAncestor) {
      // For immediate parent, check if current span is the last child
      shouldTerminate = isLast;
    } else {
      // For non-immediate ancestors, check if their descendant in the chain is the last child
      const descendantInChain = ancestors[index + 1];
      if (descendantInChain && descendantInChain.parentSpan) {
        const parentChildren = descendantInChain.parentSpan.childSpans;
        shouldTerminate = parentChildren[parentChildren.length - 1]?.spanID === descendantInChain.spanID;
      }
    }

    return {
      ancestorId: ancestor.spanID,
      // For the immediate parent the color is always needed for the horizontal connector,
      // so we never null it out. The `isLastChild` prop on SpanTreeOffset handles the
      // half-height / terminated rendering for the immediate parent guide.
      color: !isLastAncestor && shouldTerminate ? null : guideColor,
    };
  });
}
