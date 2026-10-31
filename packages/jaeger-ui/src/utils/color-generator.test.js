// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import colorGenerator, { ColorGenerator, strToRgb } from './color-generator';

const LIGHT_HEX = '#0072c3';
const DARK_HEX = '#1192e8';

/**
 * Mirrors the two vars.css blocks that define the span palette: the light
 * values on `:root` and the dark overrides under `[data-theme='dark']`.
 */
function installPaletteStylesheet() {
  const style = document.createElement('style');
  style.textContent = `
    :root { --span-color-1: ${LIGHT_HEX}; }
    [data-theme='dark'] { --span-color-1: ${DARK_HEX}; }
  `;
  document.head.appendChild(style);
  return style;
}

describe('color-generator', () => {
  beforeEach(() => {
    colorGenerator.clear();
  });

  it('gives the same color for the same key', () => {
    const colorOne = colorGenerator.getColorByKey('serviceA');
    const colorTwo = colorGenerator.getColorByKey('serviceA');
    expect(colorOne).toBe(colorTwo);
  });

  it('gives different colors for each key', () => {
    const colorOne = colorGenerator.getColorByKey('serviceA');
    const colorTwo = colorGenerator.getColorByKey('serviceB');
    expect(colorOne).not.toBe(colorTwo);
  });

  it('should clear cache', () => {
    const colorOne = colorGenerator.getColorByKey('serviceA');
    colorGenerator.clear();
    const colorTwo = colorGenerator.getColorByKey('serviceB');
    expect(colorOne).toBe(colorTwo);
  });

  it('returns [0,0,0] if invalid color string is passed to strToRgb', () => {
    expect(strToRgb('#FFF')).toEqual([0, 0, 0]);
    expect(strToRgb('')).toEqual([0, 0, 0]);
    expect(strToRgb('#1234567')).toEqual([0, 0, 0]);
  });

  describe('getRgbColorByKey', () => {
    let style;

    beforeEach(() => {
      style = installPaletteStylesheet();
    });

    afterEach(() => {
      style.remove();
      delete document.body.dataset.theme;
      delete document.documentElement.dataset.theme;
    });

    it('resolves the token to its light value by default', () => {
      expect(colorGenerator.getRgbColorByKey('serviceA')).toEqual([0x00, 0x72, 0xc3]);
    });

    // Regression: this resolved against `<html>`, which never inherits the
    // `[data-theme='dark']` overrides set on `<body>`, so canvas-drawn spans
    // used the light palette while CSS-driven spans used the dark one.
    it('resolves the dark override when the theme is set on <body>', () => {
      document.body.dataset.theme = 'dark';
      expect(colorGenerator.getRgbColorByKey('serviceA')).toEqual([0x11, 0x92, 0xe8]);
    });

    it('resolves the dark override when the theme is set on <html>', () => {
      document.documentElement.dataset.theme = 'dark';
      expect(colorGenerator.getRgbColorByKey('serviceA')).toEqual([0x11, 0x92, 0xe8]);
    });

    it('tracks a theme change without needing the cache cleared', () => {
      expect(colorGenerator.getRgbColorByKey('serviceA')).toEqual([0x00, 0x72, 0xc3]);
      document.body.dataset.theme = 'dark';
      expect(colorGenerator.getRgbColorByKey('serviceA')).toEqual([0x11, 0x92, 0xe8]);
    });

    it('keeps a key on the same token across calls', () => {
      colorGenerator.getRgbColorByKey('serviceA');
      colorGenerator.getRgbColorByKey('serviceB');
      expect(colorGenerator.getRgbColorByKey('serviceA')).toEqual([0x00, 0x72, 0xc3]);
    });

    it('returns [0,0,0] for an undefined token', () => {
      style.remove();
      expect(colorGenerator.getRgbColorByKey('serviceA')).toEqual([0, 0, 0]);
    });

    it('parses a literal palette entry without a CSS lookup', () => {
      const generator = new ColorGenerator(['#8a3ffc']);
      expect(generator.getRgbColorByKey('serviceA')).toEqual([0x8a, 0x3f, 0xfc]);
    });

    // The RGB path used to index the module-level span tokens regardless of the
    // palette the generator was constructed with.
    it('resolves a custom palette of token references', () => {
      const custom = document.createElement('style');
      custom.textContent = `:root { --custom-color: #abcdef; }`;
      document.head.appendChild(custom);

      const generator = new ColorGenerator(['var(--custom-color)']);
      expect(generator.getRgbColorByKey('serviceA')).toEqual([0xab, 0xcd, 0xef]);

      custom.remove();
    });
  });
});
