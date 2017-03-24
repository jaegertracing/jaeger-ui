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

import colorGenerator from './color-generator';

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
