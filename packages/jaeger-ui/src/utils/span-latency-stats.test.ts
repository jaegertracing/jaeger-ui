// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { computeLatencyScores, heatmapColor, HEATMAP_STEPS } from './span-latency-stats';
import { makeAttributes } from '../model/attributes';
import type { IOtelSpan } from '../types/otel';
import { SpanKind, StatusCode } from '../types/otel';
import type { Microseconds } from '../types/units';

function us(n: number): Microseconds {
  return n as unknown as Microseconds;
}

// Minimal span factory — only the fields computeLatencyScores touches.
function makeSpan(spanID: string, name: string, durationUs: number, serviceName = 'svc'): IOtelSpan {
  return {
    traceID: 'trace-1',
    spanID,
    name,
    kind: SpanKind.INTERNAL,
    startTime: us(0),
    endTime: us(durationUs),
    duration: us(durationUs),
    attributes: makeAttributes([]),
    events: [],
    links: [],
    status: { code: StatusCode.UNSET },
    resource: { serviceName, attributes: makeAttributes([]) },
    instrumentationScope: { name: 'test' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: us(0),
    inboundLinks: [],
    warnings: null,
  } as unknown as IOtelSpan;
}

describe('computeLatencyScores', () => {
  it('returns an empty map for no spans', () => {
    expect(computeLatencyScores([]).size).toBe(0);
  });

  it('leaves out spans whose operation occurs only once', () => {
    const scores = computeLatencyScores([
      makeSpan('a', 'op', 100),
      makeSpan('b', 'op', 200),
      makeSpan('c', 'lonely', 50),
    ]);
    expect(scores.has('a')).toBe(true);
    expect(scores.has('b')).toBe(true);
    expect(scores.has('c')).toBe(false);
  });

  it('scores the duration against the group median on a log2 scale', () => {
    const scores = computeLatencyScores([
      makeSpan('fast', 'op', 100),
      makeSpan('mid', 'op', 200),
      makeSpan('slow', 'op', 400),
    ]);
    expect(scores.get('fast')).toBeCloseTo(-1);
    expect(scores.get('mid')).toBe(0);
    expect(scores.get('slow')).toBeCloseTo(1);
  });

  it('uses the mean of the two middle durations as the median of an even group', () => {
    const scores = computeLatencyScores([makeSpan('a', 'op', 100), makeSpan('b', 'op', 300)]);
    // median 200: 100 is half of it, 300 is 1.5x
    expect(scores.get('a')).toBeCloseTo(-1);
    expect(scores.get('b')).toBeCloseTo(Math.log2(1.5));
  });

  it('clamps scores beyond half or twice the median', () => {
    const scores = computeLatencyScores([
      makeSpan('a', 'op', 1),
      makeSpan('b', 'op', 100),
      makeSpan('c', 'op', 10000),
    ]);
    expect(scores.get('a')).toBe(-1);
    expect(scores.get('c')).toBe(1);
  });

  it('scores tied durations at the median', () => {
    const scores = computeLatencyScores([
      makeSpan('a', 'op', 200),
      makeSpan('b', 'op', 200),
      makeSpan('c', 'op', 200),
    ]);
    for (const id of ['a', 'b', 'c']) expect(scores.get(id)).toBe(0);
  });

  it('places zero durations and zero medians at the ends of the scale', () => {
    const zeroMedian = computeLatencyScores([
      makeSpan('a', 'op', 0),
      makeSpan('b', 'op', 0),
      makeSpan('c', 'op', 50),
    ]);
    expect(zeroMedian.get('a')).toBe(0);
    expect(zeroMedian.get('c')).toBe(1);

    const zeroDuration = computeLatencyScores([
      makeSpan('a', 'op', 0),
      makeSpan('b', 'op', 50),
      makeSpan('c', 'op', 60),
    ]);
    expect(zeroDuration.get('a')).toBe(-1);
  });

  it('scores spans within a few microseconds of a tiny or zero median at the median', () => {
    const scores = computeLatencyScores([
      makeSpan('a', 'op', 0),
      makeSpan('b', 'op', 0),
      makeSpan('e', 'op', 0),
      makeSpan('c', 'op', 9),
      makeSpan('d', 'op', 10),
    ]);
    expect(scores.get('c')).toBe(0);
    expect(scores.get('d')).toBe(1);
  });

  it('scores different operations independently', () => {
    const scores = computeLatencyScores([
      makeSpan('a', 'fast-op', 10),
      makeSpan('b', 'fast-op', 40),
      makeSpan('c', 'slow-op', 1000),
      makeSpan('d', 'slow-op', 4000),
    ]);
    // 'c' is fast for slow-op even though it is slower than every fast-op span
    expect(scores.get('a')).toBeLessThan(0);
    expect(scores.get('c')).toBeLessThan(0);
    expect(scores.get('d')).toBeGreaterThan(0);
  });

  it('does not mix operations that share a name across services', () => {
    const scores = computeLatencyScores([
      makeSpan('a1', 'GET /', 10, 'frontend'),
      makeSpan('a2', 'GET /', 40, 'frontend'),
      makeSpan('b1', 'GET /', 1000, 'backend'),
      makeSpan('b2', 'GET /', 4000, 'backend'),
      makeSpan('c1', 'GET /', 5, 'lonely-service'),
    ]);
    expect(scores.get('a2')).toBeGreaterThan(0);
    expect(scores.get('b1')).toBeLessThan(0);
    expect(scores.has('c1')).toBe(false);
  });
});

describe('heatmapColor', () => {
  const NEUTRAL = `var(--heatmap-${(HEATMAP_STEPS + 1) / 2})`;

  it('has an odd number of steps so the median gets a neutral middle color', () => {
    expect(HEATMAP_STEPS % 2).toBe(1);
    expect(heatmapColor(0)).toBe(NEUTRAL);
  });

  it('uses the no-peers token when there is no score', () => {
    expect(heatmapColor(undefined)).toBe('var(--heatmap-no-peers)');
  });

  it('maps the ends of the score range to the ends of the scale', () => {
    expect(heatmapColor(-1)).toBe('var(--heatmap-1)');
    expect(heatmapColor(1)).toBe(`var(--heatmap-${HEATMAP_STEPS})`);
  });

  it('splits each half of the scale into equal steps', () => {
    expect([-0.9, -0.5, -0.2, 0.2, 0.5, 0.9].map(heatmapColor)).toEqual([
      'var(--heatmap-1)',
      'var(--heatmap-2)',
      'var(--heatmap-3)',
      'var(--heatmap-5)',
      'var(--heatmap-6)',
      'var(--heatmap-7)',
    ]);
  });

  it('clamps scores outside [-1, 1]', () => {
    expect(heatmapColor(-1.5)).toBe('var(--heatmap-1)');
    expect(heatmapColor(1.5)).toBe(`var(--heatmap-${HEATMAP_STEPS})`);
  });

  it('keeps every span of a group with equal durations neutral', () => {
    const scores = computeLatencyScores(
      Array.from({ length: 10 }, (_, i) => makeSpan(`hit-${i}`, 'cache.get', 300))
    );
    for (const score of scores.values()) expect(heatmapColor(score)).toBe(NEUTRAL);
  });

  it('keeps the middle span of an odd-sized group neutral', () => {
    const scores = computeLatencyScores([
      makeSpan('a', 'op', 100),
      makeSpan('b', 'op', 250),
      makeSpan('c', 'op', 900),
    ]);
    expect(heatmapColor(scores.get('b'))).toBe(NEUTRAL);
  });

  it('keeps a near-equal pair neutral instead of one fast and one slow span', () => {
    const scores = computeLatencyScores([makeSpan('a', 'op', 10000), makeSpan('b', 'op', 10100)]);
    expect(heatmapColor(scores.get('a'))).toBe(NEUTRAL);
    expect(heatmapColor(scores.get('b'))).toBe(NEUTRAL);
  });

  it('moves a span off neutral once it is more than 10% away from the median', () => {
    const scores = computeLatencyScores([
      makeSpan('a', 'op', 100),
      makeSpan('b', 'op', 100),
      makeSpan('c', 'op', 115),
    ]);
    expect(heatmapColor(scores.get('c'))).toBe(`var(--heatmap-${(HEATMAP_STEPS + 3) / 2})`);
  });
});
