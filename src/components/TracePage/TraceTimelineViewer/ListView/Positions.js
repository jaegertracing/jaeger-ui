export default class Positions {
  constructor(bufferLen) {
    this.ys = [];
    this.heights = [];
    this.bufferLen = bufferLen;
    this.dataLen = undefined;
    this.lastI = -1;
  }

  profileData(data) {
    this.data = data;
    if (data.length !== this.dataLen) {
      this.dataLen = data.length;
      this.ys.length = data.length;
      this.heights.length = data.length;
      if (this.lastI >= data.length) {
        this.lastI = data.length - 1;
      }
    }
  }

  calcHeights(max, heightGetter, forcedLastI) {
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

  calcYs(yValue, heightGetter) {
    while (yValue > this.ys[this.lastI] && this.lastI < this.heights.length - 1) {
      this.calcHeights(this.lastI, heightGetter);
    }
  }

  findFloorIndex(yValue, heightGetter) {
    var imin, imax, i;

    this.calcYs(yValue, heightGetter);

    imin = 0;
    imax = this.lastI;

    if (this.ys.length < 2 || yValue < this.ys[1]) {
      return 0;
    } else if (yValue > this.ys[imax]) {
      return imax;
    }
    while (imin < imax) {
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
  }

  getEstimatedHeight() {
    const known = this.ys[this.lastI] + this.heights[this.lastI];
    if (this.lastI >= this.dataLen - 1) {
      return known | 0;
    }
    return (known / (this.lastI + 1) * this.heights.length) | 0;
  }

  confirmHeight(i, heightGetter) {
    var h, chg;
    if (i > this.lastI) {
      this.calcHeights(i, heightGetter);
      return;
    }
    h = heightGetter(i);
    if (h === this.heights[i]) {
      return;
    }
    chg = h - this.heights[i];
    this.heights[i] = h;
    // shift the y positions by `chg` for all known y positions
    while (++i <= this.lastI) {
      this.ys[i] += chg;
    }
  }
}
