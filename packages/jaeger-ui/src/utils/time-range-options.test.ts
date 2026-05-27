// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ONE_HOUR_MS, TIME_RANGE_OPTIONS, lookbackFromDuration } from './time-range-options';

describe('TIME_RANGE_OPTIONS', () => {
  it('keeps lookback values and millisecond values aligned', () => {
    const unitMs = {
      m: 60_000,
      h: ONE_HOUR_MS,
      d: 24 * ONE_HOUR_MS,
      w: 7 * 24 * ONE_HOUR_MS,
    };

    TIME_RANGE_OPTIONS.forEach(({ lookback, valueMs }) => {
      const match = lookback.match(/^(\d+)([mhdw])$/);
      expect(match).not.toBeNull();

      const [, amount, unit] = match!;
      expect(valueMs).toBe(Number(amount) * unitMs[unit as keyof typeof unitMs]);
    });
  });

  it('lists options from shortest to longest', () => {
    const values = TIME_RANGE_OPTIONS.map(({ valueMs }) => valueMs);
    const sortedValues = [...values].sort((a, b) => a - b);

    expect(values).toEqual(sortedValues);
  });
});

describe('lookbackFromDuration', () => {
  it('returns the exact matching option when duration equals a bucket', () => {
    expect(lookbackFromDuration(ONE_HOUR_MS)).toBe('1h');
    expect(lookbackFromDuration(15 * 60_000)).toBe('15m');
    expect(lookbackFromDuration(2 * 24 * ONE_HOUR_MS)).toBe('2d');
  });

  it('snaps up to the next bucket when duration falls between two options', () => {
    // 70 minutes is between 1h and 2h → should snap up to 2h
    expect(lookbackFromDuration(70 * 60_000)).toBe('2h');
    // 1 minute is less than 5m → should return 5m (smallest bucket)
    expect(lookbackFromDuration(60_000)).toBe('5m');
  });

  it('returns "custom" when duration exceeds the largest option', () => {
    const largestMs = TIME_RANGE_OPTIONS[TIME_RANGE_OPTIONS.length - 1].valueMs;
    expect(lookbackFromDuration(largestMs + 1)).toBe('custom');
    expect(lookbackFromDuration(365 * 24 * ONE_HOUR_MS)).toBe('custom');
  });

  it('returns the smallest option for duration of 0', () => {
    expect(lookbackFromDuration(0)).toBe(TIME_RANGE_OPTIONS[0].lookback);
  });
});
