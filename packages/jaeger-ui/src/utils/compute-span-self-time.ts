// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan } from '../types/otel';

// Computes self-time for a span by subtracting non-overlapping child durations.
// Handles overlapping children (parallel RPCs) and children extending past parent bounds.
export default function computeSpanSelfTime(span: IOtelSpan): number {
  if (!span.hasChildren) return span.duration;

  let selfTime: number = span.duration;
  let previousChildEndTime = span.startTime;

  const children = [...span.childSpans].sort((a, b) => a.startTime - b.startTime);
  const parentEndTime = span.endTime;

  for (const child of children) {
    const childEndTime = child.endTime;
    if (child.startTime > parentEndTime || childEndTime < previousChildEndTime) {
      continue;
    }

    const nonOverlappingStart = Math.max(previousChildEndTime, child.startTime);
    const clampedEnd = Math.min(parentEndTime, childEndTime);
    selfTime -= clampedEnd - nonOverlappingStart;

    if (clampedEnd === parentEndTime) break;
    previousChildEndTime = childEndTime;
  }

  return Math.max(0, selfTime);
}
