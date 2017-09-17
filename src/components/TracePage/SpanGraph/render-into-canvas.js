// @flow

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

const CV_WIDTH = 4000;
const MIN_WIDTH = 50;

export default function renderIntoCanvas(
  canvas: HTMLCanvasElement,
  items: { valueWidth: number, valueOffset: number, serviceName: string }[],
  totalValueWidth: number,
  getFillColor: string => string
) {
  // eslint-disable-next-line  no-param-reassign
  canvas.width = CV_WIDTH;
  // eslint-disable-next-line  no-param-reassign
  canvas.height = items.length;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < items.length; i++) {
    const { valueWidth, valueOffset, serviceName } = items[i];
    // eslint-disable-next-line no-bitwise
    const x = (valueOffset / totalValueWidth * CV_WIDTH) | 0;
    // eslint-disable-next-line no-bitwise
    let width = (valueWidth / totalValueWidth * CV_WIDTH) | 0;
    if (width < MIN_WIDTH) {
      width = MIN_WIDTH;
    }
    ctx.fillStyle = getFillColor(serviceName);
    ctx.fillRect(x, i, width, 1);
  }
}
