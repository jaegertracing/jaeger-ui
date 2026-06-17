// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import computeSpanSelfTime from './compute-span-self-time';
import { IOtelSpan } from '../types/otel';

function makeSpan(startTime: number, duration: number, children: Partial<IOtelSpan>[] = []): IOtelSpan {
  return {
    startTime,
    duration,
    endTime: startTime + duration,
    hasChildren: children.length > 0,
    childSpans: children as IOtelSpan[],
  } as IOtelSpan;
}

function makeChild(startTime: number, duration: number): Partial<IOtelSpan> {
  return { startTime, duration, endTime: startTime + duration };
}

describe('computeSpanSelfTime', () => {
  it('returns full duration for a leaf span', () => {
    const span = makeSpan(0, 100);
    expect(computeSpanSelfTime(span)).toBe(100);
  });

  it('subtracts a single child that fits within parent', () => {
    // parent: [0..100], child: [10..50]
    const span = makeSpan(0, 100, [makeChild(10, 40)]);
    expect(computeSpanSelfTime(span)).toBe(60);
  });

  it('handles two non-overlapping children', () => {
    // parent: [0..100], child1: [10..30], child2: [50..70]
    const span = makeSpan(0, 100, [makeChild(10, 20), makeChild(50, 20)]);
    expect(computeSpanSelfTime(span)).toBe(60);
  });

  it('handles overlapping children (parallel RPCs)', () => {
    // parent: [0..100], child1: [10..60], child2: [30..80]
    // covered range: [10..80] = 70, self = 30
    const span = makeSpan(0, 100, [makeChild(10, 50), makeChild(30, 50)]);
    expect(computeSpanSelfTime(span)).toBe(30);
  });

  it('clamps child that extends past parent end', () => {
    // parent: [0..100], child: [50..150]
    // covered range: [50..100] = 50, self = 50
    const span = makeSpan(0, 100, [makeChild(50, 100)]);
    expect(computeSpanSelfTime(span)).toBe(50);
  });

  it('skips child that starts after parent ends', () => {
    // parent: [0..100], child: [120..150]
    const span = makeSpan(0, 100, [makeChild(120, 30)]);
    expect(computeSpanSelfTime(span)).toBe(100);
  });

  it('skips child fully covered by previous child', () => {
    // parent: [0..100], child1: [10..70], child2: [20..50] (fully within child1)
    // covered range: [10..70] = 60, self = 40
    const span = makeSpan(0, 100, [makeChild(10, 60), makeChild(20, 30)]);
    expect(computeSpanSelfTime(span)).toBe(40);
  });

  it('handles child starting at parent start', () => {
    // parent: [0..100], child: [0..100]
    const span = makeSpan(0, 100, [makeChild(0, 100)]);
    expect(computeSpanSelfTime(span)).toBe(0);
  });

  it('handles two children starting at parent start, one extending past', () => {
    // parent: [0..100], child1: [0..60], child2: [0..120]
    // covered range: [0..100] (clamped), self = 0
    const span = makeSpan(0, 100, [makeChild(0, 60), makeChild(0, 120)]);
    expect(computeSpanSelfTime(span)).toBe(0);
  });

  it('handles three short children with partial overlaps', () => {
    // parent: [0..100], child1: [10..40], child2: [30..60], child3: [70..90]
    // covered: [10..60] + [70..90] = 50 + 20 = 70, self = 30
    const span = makeSpan(0, 100, [makeChild(10, 30), makeChild(30, 30), makeChild(70, 20)]);
    expect(computeSpanSelfTime(span)).toBe(30);
  });

  it('returns zero (not negative) when children fully cover parent', () => {
    // parent: [10..50], child: [0..100] (extends both sides)
    const span = makeSpan(10, 40, [makeChild(0, 100)]);
    expect(computeSpanSelfTime(span)).toBe(0);
  });
});
