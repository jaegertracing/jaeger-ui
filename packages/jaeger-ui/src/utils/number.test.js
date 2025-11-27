// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as numberUtils from './number';

it('toFloatPrecision() should work for greater-than-0 numbers', () => {
  expect(numberUtils.toFloatPrecision(3.52, 1)).toBe(3.5);
  expect(numberUtils.toFloatPrecision(-30.52, 1)).toBe(-30.5);
  expect(numberUtils.toFloatPrecision(301.24, 0)).toBe(301);
  expect(numberUtils.toFloatPrecision(-3.14, 0)).toBe(-3);
  expect(numberUtils.toFloatPrecision(3.551, 1)).toBe(3.6);
  expect(numberUtils.toFloatPrecision(-30.55, 1)).toBe(-30.6);
  expect(numberUtils.toFloatPrecision(301.55, 0)).toBe(302);
  expect(numberUtils.toFloatPrecision(-3.55, 0)).toBe(-4);
});

it('toFloatPrecision() should work for less-than-0 numbers', () => {
  expect(numberUtils.toFloatPrecision(0.24, 1)).toBe(0.2);
  expect(numberUtils.toFloatPrecision(0.51, 1)).toBe(0.5);
  expect(numberUtils.toFloatPrecision(-0.307, 2)).toBe(-0.31);
  // Had an issue with expect(-0).toBe(0) failing
  expect(numberUtils.toFloatPrecision(-0.026, 1)).toBeCloseTo(0);
});

it('toFloatPrecision() should work for e-notation numbers', () => {
  expect(numberUtils.toFloatPrecision(6.24e6, 1)).toBe(6240000);
  expect(numberUtils.toFloatPrecision(-5.5e4, 1)).toBe(-55000);
});
