// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

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
  expect(numberUtils.toFloatPrecision(-0.026, 1)).toBe(0);
  expect(numberUtils.toFloatPrecision(0.51, 1)).toBe(0.5);
  expect(numberUtils.toFloatPrecision(-0.307, 2)).toBe(-0.31);
});

it('toFloatPrecision() should work for e-notation numbers', () => {
  expect(numberUtils.toFloatPrecision(6.24e6, 1)).toBe(6240000);
  expect(numberUtils.toFloatPrecision(-5.5e4, 1)).toBe(-55000);
});
