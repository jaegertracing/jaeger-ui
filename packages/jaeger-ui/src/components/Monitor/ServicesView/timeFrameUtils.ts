// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { convertToTimeUnit } from '../../../utils/date';

export const ONE_HOUR_MS = 3600000;
const ONE_MINUTE_MS = 60_000;

export const timeFrameOptions = [
  { label: 'Last 5 minutes', value: 5 * ONE_MINUTE_MS },
  { label: 'Last 15 minutes', value: 15 * ONE_MINUTE_MS },
  { label: 'Last 30 minutes', value: 30 * ONE_MINUTE_MS },
  { label: 'Last Hour', value: ONE_HOUR_MS },
  { label: 'Last 2 hours', value: 2 * ONE_HOUR_MS },
  { label: 'Last 6 hours', value: 6 * ONE_HOUR_MS },
  { label: 'Last 12 hours', value: 12 * ONE_HOUR_MS },
  { label: 'Last 24 hours', value: 24 * ONE_HOUR_MS },
  { label: 'Last 2 days', value: 48 * ONE_HOUR_MS },
];

export const getLoopbackInterval = (interval?: number) => {
  if (interval === undefined) return '';
  const timeFrameObj = timeFrameOptions.find(t => t.value === interval);
  if (timeFrameObj === undefined) return '';
  return timeFrameObj.label.toLowerCase();
};

export const yAxisTickFormat = (timeInMS: number, displayTimeUnit: string) =>
  convertToTimeUnit(timeInMS * 1000, displayTimeUnit);
