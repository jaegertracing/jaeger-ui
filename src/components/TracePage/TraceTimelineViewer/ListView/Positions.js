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

/**
 * Keeps track of the height and y-position for anything sequenctial where
 * y-positions follow one-after-another and can be derived from the height of
 * the prior entries. The height is known from an accessor function parameter
 * to the methods that require new knowledge the heights.
 */
export default class Positions {
  /**
   * Indicates how far past the explicitly required height or y-values should
   * checked.
   */
  bufferLen: number;
  dataLen: number;
  heights: number[];
  /**
   * `lastI` keeps track of which values have already been visited. In many
   * scenarios, values do not need to be revisited. But, revisiting is required
   * when heights have changed, so `lastI` can be forced.
   */
  lastI: number;
  ys: number[];

  constructor(bufferLen: number) {
    this.ys = [];
    this.heights = [];
    this.bufferLen = bufferLen;
    this.dataLen = -1;
    this.lastI = -1;
  }

  /**
   * Used to make sure the length of y-values and heights is consistent with
   * the context; in particular `lastI` needs to remain valid.
   *
   * @param {any[]} data
   */
  profileData(data: any[]) {
    if (data.length !== this.dataLen) {
      this.dataLen = data.length;
      this.ys.length = this.dataLen;
      this.heights.length = this.dataLen;
      if (this.lastI >= this.dataLen) {
        this.lastI = this.dataLen - 1;
      }
    }
  }

  /**
   * Calculate and save the heights and y-values, based on `heightGetter`, from
   * `lastI` until the`max` index; the starting point (`lastI`) can be forced
   * via the `forcedLastI` parameter.
   *
   * @param {number} max
   * @param {number => number} heightGetter
   * @param {number} [forcedLastI]
   */
  calcHeights(max: number, heightGetter: number => number, forcedLastI?: number) {
    if (forcedLastI != null) {
      this.lastI = forcedLastI;
    }
    let _max = max + this.bufferLen;
    if (_max <= this.lastI) {
      return;
    }
    if (_max >= this.heights.length) {
      _max = this.heights.length - 1;
    }
    let i = this.lastI;
    if (this.lastI === -1) {
      i = 0;
      this.ys[0] = 0;
    }
    while (i <= _max) {
      // eslint-disable-next-line no-multi-assign
      const h = (this.heights[i] = heightGetter(i));
      this.ys[i + 1] = this.ys[i] + h;
      i++;
    }
    this.lastI = _max;
  }

  /**
   * Verify the height and y-values from `lastI` up to `yValue`.
   *
   * @param {number} yValue
   * @param {number => number} heightGetter
   */
  calcYs(yValue: number, heightGetter: number => number) {
    while (yValue > this.ys[this.lastI] && this.lastI < this.heights.length - 1) {
      this.calcHeights(this.lastI, heightGetter);
    }
  }

  /**
   * Given a target y-value (`yValue`), find the closest index (in the `.ys`
   * array) that is prior to the y-value; e.g. map from y-value to index in
   * `.ys`.
   *
   * @param {number} yValue
   * @param {number => number} heightGetter
   * @return {number}
   */
  findFloorIndex(yValue: number, heightGetter: number => number): number {
    this.calcYs(yValue, heightGetter);

    let imin = 0;
    let imax = this.lastI;

    if (this.ys.length < 2 || yValue < this.ys[1]) {
      return 0;
    } else if (yValue > this.ys[imax]) {
      return imax;
    }
    let i;
    while (imin < imax) {
      // eslint-disable-next-line no-bitwise
      i = (imin + 0.5 * (imax - imin)) | 0;
      if (yValue > this.ys[i]) {
        if (yValue <= this.ys[i + 1]) {
          return i;
        }
        imin = i;
      } else if (yValue < this.ys[i]) {
        if (yValue >= this.ys[i - 1]) {
          return i - 1;
        }
        imax = i;
      } else {
        return i;
      }
    }
    throw new Error(`unable to find floor index for y=${yValue}`);
  }

  /**
   * Get the estimated height of the whole shebang by extrapolating based on
   * the average known height.
   *
   * @return {number}
   */
  getEstimatedHeight(): number {
    const known = this.ys[this.lastI] + this.heights[this.lastI];
    if (this.lastI >= this.dataLen - 1) {
      // eslint-disable-next-line no-bitwise
      return known | 0;
    }
    // eslint-disable-next-line no-bitwise
    return (known / (this.lastI + 1) * this.heights.length) | 0;
  }

  /**
   * Get the latest height for index `_i`. If it's in new terretory
   * (_i > lastI), find the heights (and y-values) leading up to it. If it's in
   * known territory (_i <= lastI) and the height is different than what is
   * known, recalculate subsequent y values, but don't confirm the heights of
   * those items, just update based on the difference.
   *
   * @param {number} _i
   * @param {number => number} heightGetter
   */
  confirmHeight(_i: number, heightGetter: number => number) {
    let i = _i;
    if (i > this.lastI) {
      this.calcHeights(i, heightGetter);
      return;
    }
    const h = heightGetter(i);
    if (h === this.heights[i]) {
      return;
    }
    const chg = h - this.heights[i];
    this.heights[i] = h;
    // shift the y positions by `chg` for all known y positions
    while (++i <= this.lastI) {
      this.ys[i] += chg;
    }
  }
}
