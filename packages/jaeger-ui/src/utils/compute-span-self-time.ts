// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan } from '../types/otel';

/**
 * Computes self-time for a span using a sweep-line over its children.
 * Subtracts non-overlapping child durations from the parent's duration,
 * handling overlapping children (parallel RPCs) and children extending
 * past the parent's bounds.
 *
 * Relies on IOtelSpan.childSpans being sorted by startTime (ascending).
 */
export default function computeSpanSelfTime(span: IOtelSpan): number {
  if (!span.hasChildren) return span.duration;

  let selfTime: number = span.duration;
  let previousChildEndTime = span.startTime;

  const children = span.childSpans;
  const parentEndTime = span.endTime;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childEndTime = child.endTime;

    // parent |..................|
    // child    |.......|                     - previousChild
    // child     |.....|                      - childEndsBeforePreviousChild → skip
    // child                         |......| - childStartsAfterParentEnded → skip
    if (child.startTime > parentEndTime || childEndTime < previousChildEndTime) {
      continue;
    }

    // parent |.....................|
    // child    |.......|                    - previousChild
    // child        |.....|                  - nonOverlappingStart is previousChildEndTime
    // child                |.....|          - nonOverlappingStart is child.startTime
    const nonOverlappingStart = Math.max(previousChildEndTime, child.startTime);
    const clampedEnd = Math.min(parentEndTime, childEndTime);
    selfTime -= clampedEnd - nonOverlappingStart;

    // parent |.......................|
    // child                      |.....|    - last span included; rest are past parent end
    if (clampedEnd === parentEndTime) break;
    previousChildEndTime = childEndTime;
  }

  return Math.max(0, selfTime);
}
