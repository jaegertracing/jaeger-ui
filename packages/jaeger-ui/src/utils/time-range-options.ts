// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

const ONE_MINUTE_MS = 60_000;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

export interface ITimeRangeOption {
  readonly label: string;
  readonly lookback: string;
  readonly valueMs: number;
}

export const TIME_RANGE_OPTIONS: readonly ITimeRangeOption[] = Object.freeze([
  {
    label: '5 minutes',
    lookback: '5m',
    valueMs: 5 * ONE_MINUTE_MS,
  },
  {
    label: '15 minutes',
    lookback: '15m',
    valueMs: 15 * ONE_MINUTE_MS,
  },
  {
    label: '30 minutes',
    lookback: '30m',
    valueMs: 30 * ONE_MINUTE_MS,
  },
  {
    label: '1 hour',
    lookback: '1h',
    valueMs: ONE_HOUR_MS,
  },
  {
    label: '2 hours',
    lookback: '2h',
    valueMs: 2 * ONE_HOUR_MS,
  },
  {
    label: '3 hours',
    lookback: '3h',
    valueMs: 3 * ONE_HOUR_MS,
  },
  {
    label: '6 hours',
    lookback: '6h',
    valueMs: 6 * ONE_HOUR_MS,
  },
  {
    label: '12 hours',
    lookback: '12h',
    valueMs: 12 * ONE_HOUR_MS,
  },
  {
    label: '24 hours',
    lookback: '24h',
    valueMs: 24 * ONE_HOUR_MS,
  },
  {
    label: '2 days',
    lookback: '2d',
    valueMs: 2 * ONE_DAY_MS,
  },
  {
    label: '3 days',
    lookback: '3d',
    valueMs: 3 * ONE_DAY_MS,
  },
  {
    label: '5 days',
    lookback: '5d',
    valueMs: 5 * ONE_DAY_MS,
  },
  {
    label: '7 days',
    lookback: '7d',
    valueMs: 7 * ONE_DAY_MS,
  },
  {
    label: '2 weeks',
    lookback: '2w',
    valueMs: 2 * ONE_WEEK_MS,
  },
  {
    label: '3 weeks',
    lookback: '3w',
    valueMs: 3 * ONE_WEEK_MS,
  },
  {
    label: '4 weeks',
    lookback: '4w',
    valueMs: 4 * ONE_WEEK_MS,
  },
]);

/**
 * Returns value when it is a valid lookback for the Lookback dropdown:
 * one of the TIME_RANGE_OPTIONS lookback strings, or 'custom'.
 * Use for URL params where 'custom' is a legitimate user selection.
 * For config validation use asValidConfigLookback instead.
 */
export function asValidLookback(value: string | undefined): string | undefined {
  if (value === 'custom' || TIME_RANGE_OPTIONS.some(o => o.lookback === value)) return value;
  return undefined;
}

/**
 * Returns value when it is a recognized TIME_RANGE_OPTIONS lookback string.
 * Stricter than asValidLookback: rejects 'custom' since a config default
 * of 'custom' would leave the form in an ambiguous state on load.
 */
export function asValidConfigLookback(value: string | undefined): string | undefined {
  if (TIME_RANGE_OPTIONS.some(o => o.lookback === value)) return value;
  return undefined;
}

/**
 * Given a duration in milliseconds, return the lookback string of the smallest
 * TIME_RANGE_OPTIONS entry whose window is >= durationMs.
 * Returns 'custom' if durationMs exceeds the largest option.
 */
export function lookbackFromDuration(durationMs: number): string {
  for (const option of TIME_RANGE_OPTIONS) {
    if (option.valueMs >= durationMs) return option.lookback;
  }
  return 'custom';
}
