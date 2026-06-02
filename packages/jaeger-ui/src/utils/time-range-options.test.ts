// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { Microseconds } from '../types/units';
import {
  ONE_HOUR_MS,
  TIME_RANGE_OPTIONS,
  lookbackFromDuration,
  lookbackToTimestamp,
} from './time-range-options';

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

const ONE_HOUR_US = ONE_HOUR_MS * 1000;

describe('lookbackFromDuration', () => {
  it('returns the exact matching option when duration equals a bucket', () => {
    expect(lookbackFromDuration(ONE_HOUR_US as Microseconds)).toBe('1h');
    expect(lookbackFromDuration((15 * 60_000 * 1000) as Microseconds)).toBe('15m');
    expect(lookbackFromDuration((2 * 24 * ONE_HOUR_US) as Microseconds)).toBe('2d');
  });

  it('snaps up to the next bucket when duration falls between two options', () => {
    // 70 minutes is between 1h and 2h → should snap up to 2h
    expect(lookbackFromDuration((70 * 60_000 * 1000) as Microseconds)).toBe('2h');
    // 1 minute is less than 5m → should return 5m (smallest bucket)
    expect(lookbackFromDuration((60_000 * 1000) as Microseconds)).toBe('5m');
  });

  it('returns "custom" when duration exceeds the largest option', () => {
    const largestUs = TIME_RANGE_OPTIONS[TIME_RANGE_OPTIONS.length - 1].valueMs * 1000;
    expect(lookbackFromDuration((largestUs + 1) as Microseconds)).toBe('custom');
    expect(lookbackFromDuration((365 * 24 * ONE_HOUR_US) as Microseconds)).toBe('custom');
  });

  it('returns the smallest option for duration of 0', () => {
    expect(lookbackFromDuration(0 as Microseconds)).toBe(TIME_RANGE_OPTIONS[0].lookback);
  });
});

describe('lookbackToTimestamp', () => {
  const hourInMicroseconds = 60 * 60 * 1000 * 1000;
  const now = new Date();
  const nowInMicroseconds = now.valueOf() * 1000;

  it('creates timestamp for hours ago', () => {
    [1, 2, 4, 7].forEach(lookbackNum => {
      expect(nowInMicroseconds - lookbackToTimestamp(`${lookbackNum}h`, now)).toBe(
        lookbackNum * hourInMicroseconds
      );
    });
  });

  it('creates timestamp for days ago', () => {
    [1, 2, 4, 7].forEach(lookbackNum => {
      const actual = nowInMicroseconds - lookbackToTimestamp(`${lookbackNum}d`, now);
      const expected = lookbackNum * 24 * hourInMicroseconds;
      try {
        expect(actual).toBe(expected);
      } catch {
        expect(Math.abs(actual - expected)).toBe(hourInMicroseconds);
      }
    });
  });

  it('creates timestamp for weeks ago', () => {
    [1, 2, 4, 7].forEach(lookbackNum => {
      const actual = nowInMicroseconds - lookbackToTimestamp(`${lookbackNum}w`, now);
      try {
        expect(actual).toBe(lookbackNum * 7 * 24 * hourInMicroseconds);
      } catch {
        expect(Math.abs(actual - lookbackNum * 7 * 24 * hourInMicroseconds)).toBe(hourInMicroseconds);
      }
    });
  });

  it('falls back to 1h for unsupported units', () => {
    expect(nowInMicroseconds - lookbackToTimestamp('99x', now)).toBe(hourInMicroseconds);
  });

  it('falls back to 1h for invalid amounts', () => {
    expect(nowInMicroseconds - lookbackToTimestamp('xh', now)).toBe(hourInMicroseconds);
  });
});
