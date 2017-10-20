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

import _range from 'lodash/range';

import renderIntoCanvas, { ALPHA, CV_WIDTH, MIN_TOTAL_HEIGHT, MIN_WIDTH } from './render-into-canvas';

describe('renderIntoCanvas()', () => {
  const basicItem = { valueWidth: 100, valueOffset: 50, serviceName: 'some-name' };

  class CanvasContext {
    constructor() {
      this.fillStyle = undefined;
      this.fillRectAccumulator = [];
    }

    fillRect(x, y, width, height) {
      const fillStyle = this.fillStyle;
      this.fillRectAccumulator.push({
        fillStyle,
        height,
        width,
        x,
        y,
      });
    }
  }

  class Canvas {
    constructor() {
      this.contexts = [];
      this.height = NaN;
      this.width = NaN;
      this.getContext = jest.fn(this._getContext.bind(this));
    }

    _getContext() {
      const ctx = new CanvasContext();
      this.contexts.push(ctx);
      return ctx;
    }
  }

  function getColorFactory() {
    let i = 0;
    const inputOutput = [];
    function getFakeColor(str) {
      const rv = [i, i, i];
      i++;
      inputOutput.push({
        input: str,
        output: rv.slice(),
      });
      return rv;
    }
    getFakeColor.inputOutput = inputOutput;
    return getFakeColor;
  }

  it('sets the width', () => {
    const canvas = new Canvas();
    expect(canvas.width !== canvas.width).toBe(true);
    renderIntoCanvas(canvas, [basicItem], 150, getColorFactory());
    expect(canvas.width).toBe(CV_WIDTH);
  });

  describe('when there are limited number of items', () => {
    it('sets the height', () => {
      const canvas = new Canvas();
      expect(canvas.height !== canvas.height).toBe(true);
      renderIntoCanvas(canvas, [basicItem], 150, getColorFactory());
      expect(canvas.height).toBe(MIN_TOTAL_HEIGHT);
    });

    it('draws the map', () => {
      const totalValueWidth = 4000;
      const items = [
        { valueWidth: 50, valueOffset: 50, serviceName: 'service-name-0' },
        { valueWidth: 100, valueOffset: 100, serviceName: 'service-name-1' },
        { valueWidth: 150, valueOffset: 150, serviceName: 'service-name-2' },
      ];
      const expectedColors = [
        { input: items[0].serviceName, output: [0, 0, 0] },
        { input: items[1].serviceName, output: [1, 1, 1] },
        { input: items[2].serviceName, output: [2, 2, 2] },
      ];
      const expectedDrawings = items.map((item, i) => {
        const { valueWidth: width, valueOffset: x } = item;
        const color = expectedColors[i].output;
        const fillStyle = `rgba(${color.concat(ALPHA).join()})`;
        const height = MIN_TOTAL_HEIGHT / items.length;
        const y = height * i;
        return { fillStyle, height, width, x, y };
      });
      const canvas = new Canvas();
      const getFillColor = getColorFactory();
      renderIntoCanvas(canvas, items, totalValueWidth, getFillColor);
      expect(getFillColor.inputOutput).toEqual(expectedColors);
      expect(canvas.getContext.mock.calls).toEqual([['2d']]);
      expect(canvas.contexts.length).toBe(1);
      expect(canvas.contexts[0].fillRectAccumulator).toEqual(expectedDrawings);
    });
  });

  describe('when there are many items', () => {
    it('sets the height when there are many items', () => {
      const canvas = new Canvas();
      const items = [];
      for (let i = 0; i < MIN_TOTAL_HEIGHT + 1; i++) {
        items.push(basicItem);
      }
      expect(canvas.height !== canvas.height).toBe(true);
      renderIntoCanvas(canvas, items, 150, getColorFactory());
      expect(canvas.height).toBe(items.length);
    });

    it('draws the map', () => {
      const totalValueWidth = 4000;
      const items = _range(MIN_TOTAL_HEIGHT * 10).map(i => ({
        valueWidth: i,
        valueOffset: i,
        serviceName: `service-name-${i}`,
      }));
      const itemHeight = 1 / (MIN_TOTAL_HEIGHT / items.length);
      const expectedColors = items.map((item, i) => ({
        input: item.serviceName,
        output: [i, i, i],
      }));
      const expectedDrawings = items.map((item, i) => {
        const { valueWidth, valueOffset: x } = item;
        const width = Math.max(valueWidth, MIN_WIDTH);
        const color = expectedColors[i].output;
        const fillStyle = `rgba(${color.concat(ALPHA).join()})`;
        const height = itemHeight;
        const y = i;
        return { fillStyle, height, width, x, y };
      });
      const canvas = new Canvas();
      const getFillColor = getColorFactory();
      renderIntoCanvas(canvas, items, totalValueWidth, getFillColor);
      expect(getFillColor.inputOutput).toEqual(expectedColors);
      expect(canvas.getContext.mock.calls).toEqual([['2d']]);
      expect(canvas.contexts.length).toBe(1);
      expect(canvas.contexts[0].fillRectAccumulator).toEqual(expectedDrawings);
    });
  });
});
