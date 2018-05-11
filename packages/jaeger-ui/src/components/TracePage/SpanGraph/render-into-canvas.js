// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
    ctx.fillStyle = `rgba(${getFillColor(serviceName)
      .concat(ALPHA)
      .join()})`;
    ctx.fillRect(x, i * itemYChange, width, itemHeight);
  }
}
