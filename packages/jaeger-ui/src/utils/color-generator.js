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

const COLORS_HEX = [
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

function mapHexToRgb(colors): [number, number, number][] {
  const hexRegex = /\w\w/g;
  return colors.map(s => {
    const _s = s.slice(1);
    const rv: number[] = [];
    let match = hexRegex.exec(_s);
    while (match) {
      const hex = match[0];
      const b10 = parseInt(hex, 16);
      rv.push(b10);
      match = hexRegex.exec(_s);
    }
    return Object.freeze((rv: any));
  });
}

export class ColorGenerator {
  colorsHex: string[];
  colorsRgb: [number, number, number][];
  cache: Map<string, ?number>;
  currentIdx: number;

  constructor(colorsHex: string[] = COLORS_HEX) {
    this.colorsHex = colorsHex;
    this.colorsRgb = mapHexToRgb(colorsHex);
    this.cache = new Map();
    this.currentIdx = 0;
  }

  _getColorIndex(key: string): number {
    let i = this.cache.get(key);
    if (i == null) {
      i = this.currentIdx;
      this.cache.set(key, this.currentIdx);
      this.currentIdx = ++this.currentIdx % this.colorsHex.length;
    }
    return i;
  }
  /**
   * Will assign a color to an arbitrary key.
   * If the key has been used already, it will
   * use the same color.
   *
   * @param  {String} key Key name
   * @return {String} HEX Color
   */
  getColorByKey(key: string) {
    const i = this._getColorIndex(key);
    return this.colorsHex[i];
  }

  /**
   * Retrieve the RGB values associated with a key. Adds the key and associates
   * it with a color if the key is not recognized.
   * @return {number[]} An array of three ints [0, 255] representing a color.
   */
  getRgbColorByKey(key: string): [number, number, number] {
    const i = this._getColorIndex(key);
    return this.colorsRgb[i];
  }

  clear() {
    this.cache.clear();
    this.currentIdx = 0;
  }
}

export default new ColorGenerator();
