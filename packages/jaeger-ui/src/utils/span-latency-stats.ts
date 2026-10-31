// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan } from '../types/otel';

// Number of color steps in the heatmap scale, matching --heatmap-1 … --heatmap-6 in vars.css.
export const HEATMAP_STEPS = 6;

// Returns the count of elements in a sorted array that are <= target.
// O(log n) binary search (upper bound).
function upperBound(sorted: number[], target: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Returns the count of elements in a sorted array that are < target.
// O(log n) binary search (lower bound).
function lowerBound(sorted: number[], target: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Two services can share an operation name, so peers are matched on both.
function operationKey(span: IOtelSpan): string {
  return `${span.resource.serviceName}\u0000${span.name}`;
}

/**
 * Ranks each span's duration among the other spans of the same service and operation
 * in the trace. The result maps spanID to a rank in [0, 1]: the fastest peer is 0 and
 * the slowest is 1. Spans whose operation occurs only once have no peers to compare
 * against and are left out of the map.
 */
export function computeLatencyRanks(spans: ReadonlyArray<IOtelSpan>): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const span of spans) {
    const key = operationKey(span);
    const durations = groups.get(key);
    if (durations) durations.push(span.duration);
    else groups.set(key, [span.duration]);
  }
  for (const durations of groups.values()) durations.sort((a, b) => a - b);

  const result = new Map<string, number>();
  for (const span of spans) {
    const sorted = groups.get(operationKey(span))!;
    if (sorted.length < 2) continue;
    // Tie-aware mid-rank scaled by (n - 1), so tied durations share a rank and the
    // group's minimum and maximum reach exactly 0 and 1.
    const lower = lowerBound(sorted, span.duration);
    const upper = upperBound(sorted, span.duration);
    result.set(span.spanID, (lower + upper - 1) / (2 * (sorted.length - 1)));
  }
  return result;
}

/**
 * Maps a latency rank to a heatmap color token. A missing rank means the span has no
 * peers, which gets its own neutral color rather than a spot on the scale.
 */
export function heatmapColor(rank: number | undefined): string {
  if (rank === undefined) return 'var(--heatmap-no-peers)';
  const clamped = Math.max(0, Math.min(1, rank));
  const step = Math.min(HEATMAP_STEPS - 1, Math.floor(clamped * HEATMAP_STEPS)) + 1;
  return `var(--heatmap-${step})`;
}
