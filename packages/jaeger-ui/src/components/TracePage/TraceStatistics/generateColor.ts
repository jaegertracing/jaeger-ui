// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { ITableSpan } from './types';

const MIN_HEATMAP_WEIGHT = 8;
const MAX_HEATMAP_WEIGHT = 60;

function getNumericValue(row: ITableSpan, attribute: string): number {
  const value = row[attribute as keyof ITableSpan];
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getHeatmapBackground(ratio: number): string {
  const normalizedRatio = Math.min(1, Math.max(0, ratio));
  const weight =
    Math.round((MIN_HEATMAP_WEIGHT + normalizedRatio * (MAX_HEATMAP_WEIGHT - MIN_HEATMAP_WEIGHT)) * 100) /
    100;

  return `color-mix(in srgb, var(--span-color-6) ${weight}%, var(--surface-primary))`;
}

export default function generateColor(tableValue: ITableSpan[], attribute: string, enabled: boolean) {
  const maxValue =
    enabled && attribute !== 'percent'
      ? tableValue.reduce((max, row) => Math.max(max, getNumericValue(row, attribute)), 0)
      : 100;

  return tableValue.map(row => {
    if (!enabled) {
      return {
        ...row,
        colorToPercent: row.isDetail ? 'var(--surface-tertiary)' : 'transparent',
      };
    }

    const value = getNumericValue(row, attribute);
    const ratio = maxValue > 0 ? value / maxValue : 0;

    return {
      ...row,
      colorToPercent: getHeatmapBackground(ratio),
    };
  });
}
