// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ONE_HOUR_MS, TIME_RANGE_OPTIONS } from '../../../constants/time-range-options';
import { convertToTimeUnit } from '../../../utils/date';

export { ONE_HOUR_MS };
const MAX_MONITOR_TIMEFRAME = 48 * ONE_HOUR_MS;

const formatMonitorLabel = (label: string, valueMs: number) =>
  valueMs === ONE_HOUR_MS
    ? 'Last Hour'
    : `Last ${label.replace(/\b(Minutes|Hours|Days|Weeks)\b$/, word => word.toLowerCase())}`;

export const timeFrameOptions = TIME_RANGE_OPTIONS.filter(
  ({ valueMs }) => valueMs <= MAX_MONITOR_TIMEFRAME
).map(({ label, valueMs }) => ({
  label: formatMonitorLabel(label, valueMs),
  value: valueMs,
}));

export const getLoopbackInterval = (interval?: number) => {
  if (interval === undefined) return '';
  const timeFrameObj = timeFrameOptions.find(t => t.value === interval);
  if (timeFrameObj === undefined) return '';
  return timeFrameObj.label.toLowerCase();
};

export const yAxisTickFormat = (timeInMS: number, displayTimeUnit: string) =>
  convertToTimeUnit(timeInMS * 1000, displayTimeUnit);
