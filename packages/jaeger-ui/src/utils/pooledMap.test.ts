// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { pooledMap } from './pooledMap';

describe('pooledMap', () => {
  it('maps all items and preserves order', async () => {
    const result = await pooledMap([1, 2, 3], async x => x * 2, 2);
    expect(result).toEqual([2, 4, 6]);
  });

  it('respects concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fn = async (x: number) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(r => setTimeout(r, 0));
      inFlight--;
      return x;
    };
    await pooledMap([1, 2, 3, 4, 5], fn, 2);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it('calls onProgress with correct counts', async () => {
    const calls: [number, number][] = [];
    await pooledMap(
      [1, 2, 3],
      async x => x,
      2,
      (done, total) => calls.push([done, total])
    );
    expect(calls).toHaveLength(3);
    expect(calls[calls.length - 1]).toEqual([3, 3]);
    calls.forEach(([_done, total]) => expect(total).toBe(3));
  });

  it('handles empty input', async () => {
    const result = await pooledMap([], async x => x, 4);
    expect(result).toEqual([]);
  });

  it('handles concurrency larger than item count', async () => {
    const result = await pooledMap([1, 2], async x => x * 3, 100);
    expect(result).toEqual([3, 6]);
  });

  it('throws RangeError when concurrency is less than 1', async () => {
    await expect(pooledMap([1, 2], async x => x, 0)).rejects.toThrow(RangeError);
    await expect(pooledMap([1, 2], async x => x, -1)).rejects.toThrow(RangeError);
  });

  it('throws RangeError for non-integer concurrency', async () => {
    await expect(pooledMap([1, 2], async x => x, 1.5)).rejects.toThrow(RangeError);
    await expect(pooledMap([1, 2], async x => x, NaN)).rejects.toThrow(RangeError);
    await expect(pooledMap([1, 2], async x => x, Infinity)).rejects.toThrow(RangeError);
  });

  it('rejects when fn throws and does not start further items', async () => {
    const started: number[] = [];
    // Item 1 fails immediately; items 2+ are queued but not yet started.
    // Item 0 is already in-flight (concurrency=2) and runs to completion.
    const fn = async (x: number) => {
      started.push(x);
      if (x === 1) throw new Error('boom');
      await new Promise(r => setTimeout(r, 10));
      return x;
    };
    await expect(pooledMap([0, 1, 2, 3, 4], fn, 2)).rejects.toThrow('boom');
    // Items 0 and 1 are dequeued immediately (concurrency=2).
    // Item 1 throws, setting aborted=true. Items 2+ are never dequeued.
    expect(started).toEqual([0, 1]);
  });
});
