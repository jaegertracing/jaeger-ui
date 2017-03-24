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

const DEFAULT_COLORS = [
  '#17B8BE',
  '#F8DCA1',
  '#B7885E',
  '#FFCB99',
  '#F89570',
  '#829AE3',
  '#E79FD5',
  '#1E96BE',
  '#89DAC1',
  '#B3AD9E',
  '#12939A',
  '#DDB27C',
  '#88572C',
  '#FF9833',
  '#EF5D28',
  '#162A65',
  '#DA70BF',
  '#125C77',
  '#4DC19C',
  '#776E57',
];

export class ColorGenerator {
  constructor(colorPalette = DEFAULT_COLORS) {
    this.colors = colorPalette;
    this.cache = new Map();
    this.currentIdx = 0;
  }
  /**
   * Will assign a color to an arbitrary key.
   * If the key has been used already, it will
   * use the same color.
   *
   * @param  {String} key Key name
   * @return {String} HEX Color
   */
  getColorByKey(key) {
    const cache = this.cache;
    if (!cache.has(key)) {
      cache.set(key, this.colors[this.currentIdx]);
      this.currentIdx++;
      if (this.currentIdx >= this.colors.length) {
        this.currentIdx = 0;
      }
    }
    return cache.get(key);
  }
  clear() {
    this.cache.clear();
    this.currentIdx = 0;
  }
}

export default new ColorGenerator();
