// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { computeLatencyRanks, heatmapColor, HEATMAP_STEPS } from './span-latency-stats';
import { makeAttributes } from '../model/attributes';
import type { IOtelSpan } from '../types/otel';
import { SpanKind, StatusCode } from '../types/otel';
import type { Microseconds } from '../types/units';

function us(n: number): Microseconds {
  return n as unknown as Microseconds;
}

// Minimal span factory — only the fields computeLatencyRanks touches.
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

describe('computeLatencyRanks', () => {
  it('returns an empty map for no spans', () => {
    expect(computeLatencyRanks([]).size).toBe(0);
  });

  it('leaves out spans whose operation occurs only once', () => {
    const ranks = computeLatencyRanks([
      makeSpan('a', 'op', 100),
      makeSpan('b', 'op', 200),
      makeSpan('c', 'lonely', 50),
    ]);
    expect(ranks.has('a')).toBe(true);
    expect(ranks.has('b')).toBe(true);
    expect(ranks.has('c')).toBe(false);
  });

  it('ranks the fastest and slowest span of a group at exactly 0 and 1', () => {
    const ranks = computeLatencyRanks([makeSpan('fast', 'op', 100), makeSpan('slow', 'op', 500)]);
    // min/max-normalized mean-rank: fast → (0+1-1)/(2*1) = 0, slow → (1+2-1)/(2*1) = 1
    expect(ranks.get('fast')).toBe(0);
    expect(ranks.get('slow')).toBe(1);
  });

  it('orders spans by duration within a group', () => {
    const ranks = computeLatencyRanks([
      makeSpan('fast', 'op', 100),
      makeSpan('mid', 'op', 300),
      makeSpan('slow', 'op', 500),
    ]);
    expect(ranks.get('fast')!).toBeLessThan(ranks.get('mid')!);
    expect(ranks.get('mid')!).toBeLessThan(ranks.get('slow')!);
  });

  it('gives tied durations the same mid rank', () => {
    const ranks = computeLatencyRanks([
      makeSpan('a', 'op', 200),
      makeSpan('b', 'op', 200),
      makeSpan('c', 'op', 200),
    ]);
    for (const id of ['a', 'b', 'c']) expect(ranks.get(id)).toBe(0.5);
  });

  it('ranks different operations independently', () => {
    const ranks = computeLatencyRanks([
      makeSpan('a', 'fast-op', 10),
      makeSpan('b', 'fast-op', 20),
      makeSpan('c', 'slow-op', 1000),
      makeSpan('d', 'slow-op', 2000),
    ]);
    // 'c' is fastest in slow-op even though it is slower than every fast-op span
    expect(ranks.get('a')).toBe(0);
    expect(ranks.get('c')).toBe(0);
    expect(ranks.get('d')).toBe(1);
  });

  it('does not mix operations that share a name across services', () => {
    const ranks = computeLatencyRanks([
      makeSpan('a1', 'GET /', 10, 'frontend'),
      makeSpan('a2', 'GET /', 20, 'frontend'),
      makeSpan('b1', 'GET /', 1000, 'backend'),
      makeSpan('b2', 'GET /', 2000, 'backend'),
      makeSpan('c1', 'GET /', 5, 'lonely-service'),
    ]);
    expect(ranks.get('a2')).toBe(1);
    expect(ranks.get('b1')).toBe(0);
    expect(ranks.has('c1')).toBe(false);
  });
});

describe('heatmapColor', () => {
  it('uses the no-peers token when there is no rank', () => {
    expect(heatmapColor(undefined)).toBe('var(--heatmap-no-peers)');
  });

  it('maps the fastest and slowest ranks to the ends of the scale', () => {
    expect(heatmapColor(0)).toBe('var(--heatmap-1)');
    expect(heatmapColor(1)).toBe(`var(--heatmap-${HEATMAP_STEPS})`);
  });

  it('splits the scale into equal steps', () => {
    const steps = Array.from({ length: HEATMAP_STEPS }, (_, i) => heatmapColor((i + 0.5) / HEATMAP_STEPS));
    expect(steps).toEqual(Array.from({ length: HEATMAP_STEPS }, (_, i) => `var(--heatmap-${i + 1})`));
  });

  it('clamps ranks outside [0, 1]', () => {
    expect(heatmapColor(-0.5)).toBe('var(--heatmap-1)');
    expect(heatmapColor(1.5)).toBe(`var(--heatmap-${HEATMAP_STEPS})`);
  });
});
