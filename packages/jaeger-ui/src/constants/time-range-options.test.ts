// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ONE_HOUR_MS, TIME_RANGE_OPTIONS } from './time-range-options';

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
