// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import colorGenerator, { strToRgb } from './color-generator';

it('gives the same color for the same key', () => {
  colorGenerator.clear();
  const colorOne = colorGenerator.getColorByKey('serviceA');
  const colorTwo = colorGenerator.getColorByKey('serviceA');
  expect(colorOne).toBe(colorTwo);
});

it('gives different colors for each for each key', () => {
  colorGenerator.clear();
  const colorOne = colorGenerator.getColorByKey('serviceA');
  const colorTwo = colorGenerator.getColorByKey('serviceB');
  expect(colorOne).not.toBe(colorTwo);
});

it('should clear cache', () => {
  colorGenerator.clear();
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

it('getRgbColorByKey should resolve CSS variables', () => {
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = jest.fn().mockReturnValue({
    getPropertyValue: jest.fn().mockImplementation(prop => {
      if (prop === '--span-color-1') return '#8a3ffc';
      return '';
    }),
  });

  colorGenerator.clear();
  const rgb = colorGenerator.getRgbColorByKey('serviceA');
  expect(rgb).toEqual([138, 63, 252]);

  window.getComputedStyle = originalGetComputedStyle;
});
