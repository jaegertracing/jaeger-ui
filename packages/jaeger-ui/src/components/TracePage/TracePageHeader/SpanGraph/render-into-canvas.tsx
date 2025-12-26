// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TNil } from '../../../../types';

// exported for tests
export const BG_COLOR_LIGHT = '#fff';
export const BG_COLOR_DARK = '#0b1625';
export const ITEM_ALPHA = 0.8;
export const MIN_ITEM_HEIGHT = 2;
export const MAX_TOTAL_HEIGHT = 200;
export const MIN_ITEM_WIDTH = 10;
export const MIN_TOTAL_HEIGHT = 60;
export const MAX_ITEM_HEIGHT = 6;

/**
 * Get the current theme background color based on data-theme attribute
 */
function getBackgroundColor(): string {
  if (typeof document !== 'undefined' && document.body) {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    return isDark ? BG_COLOR_DARK : BG_COLOR_LIGHT;
  }
  // Default to light background when document or document.body is unavailable (SSR, tests)
  return BG_COLOR_LIGHT;
}

export default function renderIntoCanvas(
  canvas: HTMLCanvasElement,
  items: { valueWidth: number; valueOffset: number; serviceName: string }[],
  totalValueWidth: number,
  getFillColor: (serviceName: string) => [number, number, number]
) {
  const fillCache: Map<string, string | TNil> = new Map();
  const cHeight =
    items.length < MIN_TOTAL_HEIGHT ? MIN_TOTAL_HEIGHT : Math.min(items.length, MAX_TOTAL_HEIGHT);
  const cWidth = window.innerWidth * 2;

  canvas.width = cWidth;

  canvas.height = cHeight;
  const itemHeight = Math.min(MAX_ITEM_HEIGHT, Math.max(MIN_ITEM_HEIGHT, cHeight / items.length));
  const itemYChange = cHeight / items.length;

  const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
  ctx.fillStyle = getBackgroundColor();
  ctx.fillRect(0, 0, cWidth, cHeight);
  for (let i = 0; i < items.length; i++) {
    const { valueWidth, valueOffset, serviceName } = items[i];
    const x = (valueOffset / totalValueWidth) * cWidth;
    let width = (valueWidth / totalValueWidth) * cWidth;
    if (width < MIN_ITEM_WIDTH) {
      width = MIN_ITEM_WIDTH;
    }
    let fillStyle = fillCache.get(serviceName);
    if (!fillStyle) {
      fillStyle = `rgba(${getFillColor(serviceName).concat(ITEM_ALPHA).join()})`;
      fillCache.set(serviceName, fillStyle);
    }
    ctx.fillStyle = fillStyle;
    ctx.fillRect(x, i * itemYChange, width, itemHeight);
  }
}
