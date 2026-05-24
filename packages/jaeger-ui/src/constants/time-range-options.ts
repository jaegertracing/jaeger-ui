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
    label: '5 Minutes',
    lookback: '5m',
    valueMs: 5 * ONE_MINUTE_MS,
  },
  {
    label: '15 Minutes',
    lookback: '15m',
    valueMs: 15 * ONE_MINUTE_MS,
  },
  {
    label: '30 Minutes',
    lookback: '30m',
    valueMs: 30 * ONE_MINUTE_MS,
  },
  {
    label: 'Hour',
    lookback: '1h',
    valueMs: ONE_HOUR_MS,
  },
  {
    label: '2 Hours',
    lookback: '2h',
    valueMs: 2 * ONE_HOUR_MS,
  },
  {
    label: '3 Hours',
    lookback: '3h',
    valueMs: 3 * ONE_HOUR_MS,
  },
  {
    label: '6 Hours',
    lookback: '6h',
    valueMs: 6 * ONE_HOUR_MS,
  },
  {
    label: '12 Hours',
    lookback: '12h',
    valueMs: 12 * ONE_HOUR_MS,
  },
  {
    label: '24 Hours',
    lookback: '24h',
    valueMs: 24 * ONE_HOUR_MS,
  },
  {
    label: '2 Days',
    lookback: '2d',
    valueMs: 2 * ONE_DAY_MS,
  },
  {
    label: '3 Days',
    lookback: '3d',
    valueMs: 3 * ONE_DAY_MS,
  },
  {
    label: '5 Days',
    lookback: '5d',
    valueMs: 5 * ONE_DAY_MS,
  },
  {
    label: '7 Days',
    lookback: '7d',
    valueMs: 7 * ONE_DAY_MS,
  },
  {
    label: '2 Weeks',
    lookback: '2w',
    valueMs: 2 * ONE_WEEK_MS,
  },
  {
    label: '3 Weeks',
    lookback: '3w',
    valueMs: 3 * ONE_WEEK_MS,
  },
  {
    label: '4 Weeks',
    lookback: '4w',
    valueMs: 4 * ONE_WEEK_MS,
  },
]);
