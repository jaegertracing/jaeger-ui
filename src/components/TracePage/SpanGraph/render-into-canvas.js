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

// exported for tests
export const CV_WIDTH = 4000;
export const MIN_WIDTH = 16;
export const MIN_TOTAL_HEIGHT = 60;
export const ALPHA = 0.8;

export default function renderIntoCanvas(
  canvas: HTMLCanvasElement,
  items: { valueWidth: number, valueOffset: number, serviceName: string }[],
  totalValueWidth: number,
  getFillColor: string => [number, number, number]
) {
  // eslint-disable-next-line no-param-reassign
  canvas.width = CV_WIDTH;
  let itemHeight = 1;
  let itemYChange = 1;
  if (items.length < MIN_TOTAL_HEIGHT) {
    // eslint-disable-next-line no-param-reassign
    canvas.height = MIN_TOTAL_HEIGHT;
    itemHeight = MIN_TOTAL_HEIGHT / items.length;
    itemYChange = MIN_TOTAL_HEIGHT / items.length;
  } else {
    // eslint-disable-next-line no-param-reassign
    canvas.height = items.length;
    itemYChange = 1;
    itemHeight = 1 / (MIN_TOTAL_HEIGHT / items.length);
  }
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
    ctx.fillStyle = `rgba(${getFillColor(serviceName).concat(ALPHA).join()})`;
    ctx.fillRect(x, i * itemYChange, width, itemHeight);
  }
}
