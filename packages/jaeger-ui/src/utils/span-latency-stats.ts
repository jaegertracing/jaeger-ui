// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan } from '../types/otel';

// Number of color steps in the heatmap scale, matching --heatmap-1 … --heatmap-7 in vars.css.
// The count is odd so that the middle step is a neutral color for spans at the median.
export const HEATMAP_STEPS = 7;

// Duration ratio to the group median at which the scale saturates: half the median or less is
// the fastest step, twice the median or more is the slowest.
const HEATMAP_SATURATION_RATIO = 2;

// Spans within this relative distance of the median stay neutral, so near-equal durations such
// as a retry pair at 10ms and 10.1ms don't show up as one fast and one slow span.
const HEATMAP_NEUTRAL_SPREAD = 0.1;

// Spans within this many microseconds of the median also stay neutral. A ratio means little at
// that scale, and without the floor a tiny or zero median would pin a span only a few
// microseconds slower to the slowest step.
const HEATMAP_NEUTRAL_FLOOR_US = 10;

const NEUTRAL_LIMIT = Math.log(1 + HEATMAP_NEUTRAL_SPREAD) / Math.log(HEATMAP_SATURATION_RATIO);
const SIDE_STEPS = (HEATMAP_STEPS - 1) / 2;

// Two services can share an operation name, so peers are matched on both.
function operationKey(span: IOtelSpan): string {
  return `${span.resource.serviceName}\u0000${span.name}`;
}

function median(sorted: number[]): number {
  const mid = sorted.length >>> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Scores each span's duration against the median duration of its group: all spans in the trace,
 * itself included, with the same service and operation. The score is log(duration / median) on
 * a base of HEATMAP_SATURATION_RATIO, clamped to [-1, 1]: 0 is the median, -1 is half of it or
 * less, and 1 is twice it or more. Spans within HEATMAP_NEUTRAL_FLOOR_US of the median score 0.
 * Spans whose operation occurs only once have no peers to compare against and are left out of
 * the map.
 */
export function computeLatencyScores(spans: ReadonlyArray<IOtelSpan>): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const span of spans) {
    const key = operationKey(span);
    const durations = groups.get(key);
    if (durations) durations.push(span.duration);
    else groups.set(key, [span.duration]);
  }
  const medians = new Map<string, number>();
  for (const [key, durations] of groups) {
    if (durations.length < 2) continue;
    durations.sort((a, b) => a - b);
    medians.set(key, median(durations));
  }

  const result = new Map<string, number>();
  for (const span of spans) {
    const med = medians.get(operationKey(span));
    if (med === undefined) continue;
    let score: number;
    if (Math.abs(span.duration - med) < HEATMAP_NEUTRAL_FLOOR_US) score = 0;
    // A zero median or duration has no finite ratio, so it sits at the matching end of the scale.
    else if (med <= 0) score = 1;
    else if (span.duration <= 0) score = -1;
    else score = Math.log(span.duration / med) / Math.log(HEATMAP_SATURATION_RATIO);
    result.set(span.spanID, Math.max(-1, Math.min(1, score)));
  }
  return result;
}

/**
 * Maps a latency score to a heatmap color token. Scores inside the neutral spread get the
 * middle step, and the rest spread evenly over the fast and slow halves. A missing score
 * means the span has no peers, which gets its own color rather than a spot on the scale.
 */
export function heatmapColor(score: number | undefined): string {
  if (score === undefined) return 'var(--heatmap-no-peers)';
  const middle = SIDE_STEPS + 1;
  const magnitude = Math.min(1, Math.abs(score));
  if (Number.isNaN(magnitude) || magnitude <= NEUTRAL_LIMIT) return `var(--heatmap-${middle})`;
  const offset = Math.max(1, Math.ceil(magnitude * SIDE_STEPS));
  return `var(--heatmap-${score < 0 ? middle - offset : middle + offset})`;
}
