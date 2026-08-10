// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ONE_HOUR_MS, TIME_RANGE_OPTIONS } from '../../../utils/time-range-options';
import { convertToTimeUnit } from '../../../utils/date';

export { ONE_HOUR_MS };
const MAX_MONITOR_TIMEFRAME = 48 * ONE_HOUR_MS;

export const timeFrameOptions = TIME_RANGE_OPTIONS.filter(
  ({ valueMs }) => valueMs <= MAX_MONITOR_TIMEFRAME
).map(({ label, valueMs }) => ({ label, value: valueMs }));

export const getLoopbackInterval = (interval?: number) => {
  if (interval === undefined) return '';
  const timeFrameObj = timeFrameOptions.find(t => t.value === interval);
  if (timeFrameObj === undefined) return '';
  return timeFrameObj.label.toLowerCase();
};

export const yAxisTickFormat = (timeInMS: number, displayTimeUnit: string) =>
  convertToTimeUnit(timeInMS * 1000, displayTimeUnit);
