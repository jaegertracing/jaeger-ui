// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Span categorical colors are defined in vars.css using the Design Token Architecture.
 */
const SPAN_COLOR_VARS = Array.from({ length: 20 }, (_, i) => `--span-color-${i + 1}`);
const SPAN_COLORS = SPAN_COLOR_VARS.map(v => `var(${v})`);

/** Matches a bare custom-property reference, capturing the property name. */
const CSS_VAR_REFERENCE = /^var\(\s*(--[^\s,)]+)\s*\)$/;

/**
 * Returns the element to resolve theme-dependent custom properties against.
 *
 * `ThemeProvider` sets `data-theme` on `<body>`, and vars.css overrides the span
 * palette under `[data-theme='dark']`. Custom properties inherit downward only,
 * so `<html>` never sees those overrides and always reports the light values.
 * `<body>` is correct whichever of the two elements carries the attribute.
 */
function getThemedElement(): Element {
  return document.body ?? document.documentElement;
}

// TS needs the precise return type
export function strToRgb(s: string): [number, number, number] {
  const trimmed = s.trim();
  if (trimmed.length !== 7) {
    return [0, 0, 0];
  }
  const r = trimmed.slice(1, 3);
  const g = trimmed.slice(3, 5);
  const b = trimmed.slice(5);
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}

export class ColorGenerator {
  colors: string[];
  cache: Map<string, number>;
  currentIdx: number;

  constructor(colors: string[] = SPAN_COLORS) {
    this.colors = colors;
    this.cache = new Map();
    this.currentIdx = 0;
  }

  _getColorIndex(key: string): number {
    let i = this.cache.get(key);
    if (i == null) {
      i = this.currentIdx;
      this.cache.set(key, this.currentIdx);
      this.currentIdx = ++this.currentIdx % this.colors.length;
    }
    return i;
  }

  /**
   * Will assign a color to an arbitrary key.
   * If the key has been used already, it will
   * use the same color.
   */
  getColorByKey(key: string) {
    const i = this._getColorIndex(key);
    return this.colors[i];
  }

  /**
   * Retrieve the RGB values associated with a key. Adds the key and associates
   * it with a color if the key is not recognized.
   * @return {number[]} An array of three ints [0, 255] representing a color.
   */
  getRgbColorByKey(key: string): [number, number, number] {
    const color = this.colors[this._getColorIndex(key)];
    // Read the property name off `this.colors` rather than the module-level list,
    // so a generator built with a custom palette resolves its own colors.
    const varName = CSS_VAR_REFERENCE.exec(color)?.[1];
    if (!varName) {
      // A literal color needs no lookup.
      return strToRgb(color);
    }
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const hex = window.getComputedStyle(getThemedElement()).getPropertyValue(varName);
      if (hex) {
        return strToRgb(hex);
      }
    }
    // Fallback or default if window is not available (e.g. tests or server-side)
    return [0, 0, 0];
  }

  clear() {
    this.cache.clear();
    this.currentIdx = 0;
  }
}

export default new ColorGenerator();
