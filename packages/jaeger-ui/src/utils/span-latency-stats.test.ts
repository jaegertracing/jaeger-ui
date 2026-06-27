// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { computeLatencyStats, heatmapColor } from './span-latency-stats';
import type { IOtelSpan } from '../types/otel';
import { SpanKind, StatusCode } from '../types/otel';
import type { CriticalPathSection } from '../types/critical_path';
import type { Microseconds } from '../types/units';

function us(n: number): Microseconds {
  return n as unknown as Microseconds;
}

// Minimal span factory — only the fields computeLatencyStats touches.
function makeSpan(spanID: string, name: string, durationUs: number): IOtelSpan {
  return {
    traceID: 'trace-1',
    spanID,
    name,
    kind: SpanKind.INTERNAL,
    startTime: us(0),
    endTime: us(durationUs),
    duration: us(durationUs),
    attributes: [],
    events: [],
    links: [],
    status: { code: StatusCode.UNSET },
    resource: { serviceName: 'svc', attributes: [] },
    instrumentationScope: { name: 'test' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: us(0),
    inboundLinks: [],
    warnings: null,
  } as unknown as IOtelSpan;
}

function makeCritical(spanID: string): CriticalPathSection {
  return { spanID, sectionStart: us(0), sectionEnd: us(1) };
}

// ─── computeLatencyStats ────────────────────────────────────────────────────

describe('computeLatencyStats', () => {
  it('returns empty map for empty spans', () => {
    expect(computeLatencyStats([], []).size).toBe(0);
  });

  it('produces an entry for every span', () => {
    const spans = [makeSpan('a', 'op', 100), makeSpan('b', 'op', 200)];
    const stats = computeLatencyStats(spans, []);
    expect(stats.has('a')).toBe(true);
    expect(stats.has('b')).toBe(true);
  });

  it('groupSize equals count of same-operation spans', () => {
    const spans = [makeSpan('a', 'op', 100), makeSpan('b', 'op', 200), makeSpan('c', 'other', 50)];
    const stats = computeLatencyStats(spans, []);
    expect(stats.get('a')!.groupSize).toBe(2);
    expect(stats.get('b')!.groupSize).toBe(2);
    expect(stats.get('c')!.groupSize).toBe(1);
  });

  it('single span in group: percentileRank = 1, zScore = NaN, stdDev = 0', () => {
    const stats = computeLatencyStats([makeSpan('x', 'lonely', 300)], []);
    const s = stats.get('x')!;
    expect(s.percentileRank).toBe(1);
    expect(Number.isNaN(s.zScore)).toBe(true);
    expect(s.stdDev).toBe(0);
  });

  it('slowest span in group has percentileRank = 1', () => {
    const spans = [makeSpan('fast', 'op', 100), makeSpan('slow', 'op', 500)];
    const stats = computeLatencyStats(spans, []);
    expect(stats.get('slow')!.percentileRank).toBe(1);
  });

  it('fastest span in group has lowest percentileRank', () => {
    const spans = [makeSpan('fast', 'op', 100), makeSpan('mid', 'op', 300), makeSpan('slow', 'op', 500)];
    const stats = computeLatencyStats(spans, []);
    expect(stats.get('fast')!.percentileRank).toBeLessThan(stats.get('mid')!.percentileRank);
    expect(stats.get('mid')!.percentileRank).toBeLessThan(stats.get('slow')!.percentileRank);
  });

  it('p50 is median duration of group', () => {
    const spans = [makeSpan('a', 'op', 100), makeSpan('b', 'op', 200), makeSpan('c', 'op', 300)];
    const stats = computeLatencyStats(spans, []);
    // sorted: [100, 200, 300], p50 index = floor(0.5 * 2) = 1 → 200
    expect(stats.get('a')!.p50Us).toBe(200);
  });

  it('p95 is at 95th percentile of group', () => {
    const spans = Array.from({ length: 20 }, (_, i) => makeSpan(`s${i}`, 'op', (i + 1) * 100));
    const stats = computeLatencyStats(spans, []);
    // sorted [100..2000], p95 index = floor(0.95 * 19) = 18 → 1900
    expect(stats.get('s0')!.p95Us).toBe(1900);
  });

  it('mean is correct via Welford algorithm', () => {
    const spans = [makeSpan('a', 'op', 100), makeSpan('b', 'op', 200), makeSpan('c', 'op', 300)];
    const stats = computeLatencyStats(spans, []);
    expect(stats.get('a')!.mean).toBeCloseTo(200);
  });

  it('stdDev is correct (sample std dev)', () => {
    const spans = [makeSpan('a', 'op', 100), makeSpan('b', 'op', 300)];
    const stats = computeLatencyStats(spans, []);
    // sample stdDev of [100, 300] = sqrt(((100-200)^2 + (300-200)^2) / 1) = sqrt(20000) ≈ 141.42
    expect(stats.get('a')!.stdDev).toBeCloseTo(141.42, 1);
  });

  it('zScore > 0 for above-mean span', () => {
    const spans = [makeSpan('a', 'op', 100), makeSpan('b', 'op', 300)];
    const stats = computeLatencyStats(spans, []);
    expect(stats.get('b')!.zScore).toBeGreaterThan(0);
    expect(stats.get('a')!.zScore).toBeLessThan(0);
  });

  it('zScore = NaN for group of 1', () => {
    const stats = computeLatencyStats([makeSpan('x', 'unique-op', 500)], []);
    expect(Number.isNaN(stats.get('x')!.zScore)).toBe(true);
  });

  // ─── Critical path weighting ───────────────────────────────────────────────

  it('onCriticalPath = false when span not in criticalPath', () => {
    const spans = [makeSpan('a', 'op', 100)];
    const stats = computeLatencyStats(spans, []);
    expect(stats.get('a')!.onCriticalPath).toBe(false);
  });

  it('onCriticalPath = true when span is in criticalPath', () => {
    const spans = [makeSpan('a', 'op', 100)];
    const stats = computeLatencyStats(spans, [makeCritical('a')]);
    expect(stats.get('a')!.onCriticalPath).toBe(true);
  });

  it('weightedScore is capped at 1.0 even with 1.5× multiplier', () => {
    const spans = [makeSpan('a', 'op', 100)];
    // single span → percentileRank=1, × 1.5 = 1.5, should cap at 1.0
    const stats = computeLatencyStats(spans, [makeCritical('a')]);
    expect(stats.get('a')!.weightedScore).toBe(1.0);
  });

  it('weightedScore without critical path equals percentileRank', () => {
    const spans = [makeSpan('fast', 'op', 100), makeSpan('slow', 'op', 500)];
    const stats = computeLatencyStats(spans, []);
    const fast = stats.get('fast')!;
    expect(fast.weightedScore).toBeCloseTo(fast.percentileRank);
  });

  it('critical-path span has strictly higher weightedScore than equal-rank off-path span', () => {
    // 'onPath' and 'offPath' share the same duration and therefore the same percentileRank,
    // but only 'onPath' receives the 1.5× boost
    const spans2 = [makeSpan('onPath', 'grp', 100), makeSpan('y', 'grp', 200), makeSpan('offPath', 'grp', 100)];
    const stats2 = computeLatencyStats(spans2, [makeCritical('onPath')]);
    const onPathScore = stats2.get('onPath')!.weightedScore;
    const offPathScore = stats2.get('offPath')!.weightedScore;
    expect(onPathScore).toBeGreaterThan(offPathScore);
  });

  it('different operations are grouped independently', () => {
    const spans = [
      makeSpan('a', 'fast-op', 10),
      makeSpan('b', 'fast-op', 20),
      makeSpan('c', 'slow-op', 1000),
      makeSpan('d', 'slow-op', 2000),
    ];
    const stats = computeLatencyStats(spans, []);
    // 'c' is fastest in slow-op group, 'a' is fastest in fast-op group
    expect(stats.get('c')!.groupSize).toBe(2);
    expect(stats.get('a')!.groupSize).toBe(2);
    // p50 for fast-op = 10 (index 0), slow-op p50 = 1000 (index 0)
    expect(stats.get('a')!.p50Us).toBe(10);
    expect(stats.get('c')!.p50Us).toBe(1000);
  });

  it('all spans identical duration → all have percentileRank = 1', () => {
    const spans = [makeSpan('a', 'op', 200), makeSpan('b', 'op', 200), makeSpan('c', 'op', 200)];
    const stats = computeLatencyStats(spans, []);
    for (const id of ['a', 'b', 'c']) {
      expect(stats.get(id)!.percentileRank).toBe(1);
    }
  });

  it('zScore ≈ 0 for mean-valued span in large uniform group', () => {
    const spans = [makeSpan('lo', 'op', 100), makeSpan('mean', 'op', 200), makeSpan('hi', 'op', 300)];
    const stats = computeLatencyStats(spans, []);
    expect(Math.abs(stats.get('mean')!.zScore)).toBeLessThan(0.1);
  });
});

// ─── heatmapColor ──────────────────────────────────────────────────────────

describe('heatmapColor', () => {
  it('score 0 returns green (hue 120)', () => {
    expect(heatmapColor(0)).toBe('hsl(120, 80%, 45%)');
  });

  it('score 1 returns red (hue 0)', () => {
    expect(heatmapColor(1)).toBe('hsl(0, 80%, 45%)');
  });

  it('score 0.5 returns yellow-green (hue 60)', () => {
    expect(heatmapColor(0.5)).toBe('hsl(60, 80%, 45%)');
  });

  it('clamps values below 0 to green', () => {
    expect(heatmapColor(-0.5)).toBe('hsl(120, 80%, 45%)');
  });

  it('clamps values above 1 to red', () => {
    expect(heatmapColor(1.5)).toBe('hsl(0, 80%, 45%)');
  });

  it('score 0.25 returns hue 90 (lime)', () => {
    expect(heatmapColor(0.25)).toBe('hsl(90, 80%, 45%)');
  });

  it('score 0.75 returns hue 30 (orange)', () => {
    expect(heatmapColor(0.75)).toBe('hsl(30, 80%, 45%)');
  });

  it('returns valid CSS hsl() string format', () => {
    const color = heatmapColor(0.6);
    expect(color).toMatch(/^hsl\(\d+, 80%, 45%\)$/);
  });
});
