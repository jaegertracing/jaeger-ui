// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { CriticalPathSection } from '../types/critical_path';
import { IOtelSpan } from '../types/otel';

export type LatencyStats = {
  percentileRank: number; // 0–1, position in the operation's duration distribution
  zScore: number; // NaN when groupSize < 2 or when stdDev is 0 (all durations in the group are identical)
  p50Us: number;
  p95Us: number;
  mean: number;
  stdDev: number;
  groupSize: number;
  weightedScore: number; // percentileRank × 1.5 if on critical path, capped at 1.0
  onCriticalPath: boolean;
};

type WelfordState = {
  count: number;
  mean: number;
  M2: number; // sum of squared deviations — Welford's online variance
  durations: number[];
};

// Welford's single-pass online algorithm: numerically stable O(n) mean + variance.
function welfordUpdate(state: WelfordState, x: number): void {
  state.count += 1;
  const delta = x - state.mean;
  state.mean += delta / state.count;
  const delta2 = x - state.mean;
  state.M2 += delta * delta2;
  state.durations.push(x);
}

function percentileByIndex(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx];
}

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

/**
 * Computes per-span latency statistics relative to same-operation peers in the trace.
 * Uses Welford's algorithm for O(n) single-pass mean/variance, then O(m log m) sort
 * per operation group to derive percentile ranks and P50/P95 thresholds.
 */
export function computeLatencyStats(
  spans: ReadonlyArray<IOtelSpan>,
  criticalPath: CriticalPathSection[]
): Map<string, LatencyStats> {
  const criticalSpanIDs = new Set(criticalPath.map(s => s.spanID));

  // Group spans by operation name (span.name), accumulating Welford state per group.
  const groups = new Map<string, WelfordState>();
  for (const span of spans) {
    const key = span.name;
    if (!groups.has(key)) {
      groups.set(key, { count: 0, mean: 0, M2: 0, durations: [] });
    }
    welfordUpdate(groups.get(key)!, span.duration);
  }

  // Sort durations per group once — O(m log m) per group.
  const sortedGroups = new Map<string, number[]>();
  for (const [key, state] of groups) {
    sortedGroups.set(
      key,
      [...state.durations].sort((a, b) => a - b)
    );
  }

  const result = new Map<string, LatencyStats>();
  for (const span of spans) {
    const key = span.name;
    const state = groups.get(key)!;
    const sorted = sortedGroups.get(key)!;

    const stdDev = state.count >= 2 ? Math.sqrt(state.M2 / (state.count - 1)) : 0;
    const zScore = state.count >= 2 && stdDev > 0 ? (span.duration - state.mean) / stdDev : NaN;

    // Percentile rank: tie-aware mid-rank normalized so the group's minimum duration
    // maps to exactly 0 and its maximum maps to exactly 1 (mean-rank formula scaled to
    // [0, 1] by (n - 1) rather than n). This keeps tied durations centered in the
    // distribution while still letting the fastest/slowest span reach full green/red.
    // A group of size 1 has no meaningful min/max, so it reports a neutral 0.5.
    // Both bounds run in O(log m) vs the previous O(m) filter scan.
    const lower = lowerBound(sorted, span.duration);
    const upper = upperBound(sorted, span.duration);
    const rank = sorted.length > 1 ? (lower + upper - 1) / (2 * (sorted.length - 1)) : 0.5;

    const p50Us = percentileByIndex(sorted, 0.5);
    const p95Us = percentileByIndex(sorted, 0.95);

    const onCriticalPath = criticalSpanIDs.has(span.spanID);
    const weightedScore = Math.min(rank * (onCriticalPath ? 1.5 : 1.0), 1.0);

    result.set(span.spanID, {
      percentileRank: rank,
      zScore,
      p50Us,
      p95Us,
      mean: state.mean,
      stdDev,
      groupSize: state.count,
      weightedScore,
      onCriticalPath,
    });
  }

  return result;
}

/**
 * Maps a weighted score (0–1) to an HSL color.
 * 0 → hue 120° (green, fast), 1 → hue 0° (red, slow).
 * HSL interpolation is perceptually uniform compared to RGB midpoints.
 */
export function heatmapColor(weightedScore: number): string {
  const clamped = Math.max(0, Math.min(1, weightedScore));
  const hue = Math.round(120 * (1 - clamped));
  return `hsl(${hue}, 80%, 45%)`;
}
