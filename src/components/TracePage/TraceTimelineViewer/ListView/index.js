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

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Positions from './Positions';

const defaultGetKeyFromIndex = i => String(i);
const defaultGetIndexFromKey = s => Number(s);

export default class ListView extends Component {
  constructor(props) {
    super(props);

    this.yPositions = new Positions(200);
    // _knownHeights is (item-key => observed height) of list items
    this._knownHeights = new Map();
    this._getHeight = this._getHeight.bind(this);
    this._scanItemHeights = this._scanItemHeights.bind(this);

    this._startIndexDrawn = 2 ** 20;
    this._endIndexDrawn = -(2 ** 20);
    this._startIndex = 0;
    this._endIndex = 0;
    this._viewHeight = undefined;
    this._scrollTop = undefined;
    this._isScrolledOrResized = false;

    this._onScroll = this._onScroll.bind(this);
    this._positionList = this._positionList.bind(this);

    this._htmlTopOffset = undefined;
    this._windowScrollListenerAdded = false;
    if (props.windowScroller) {
      this._htmlElm = window.document.querySelector('html');
    } else {
      this._htmlElm = undefined;
    }
    this._wrapperElm = undefined;
    this._itemHolder = undefined;
    this._initWrapper = this._initWrapper.bind(this);
    this._initItemHolder = this._initItemHolder.bind(this);
  }

  componentDidMount() {
    if (this.props.windowScroller) {
      if (this._wrapperElm) {
        const { top } = this._wrapperElm.getBoundingClientRect();
        this._htmlTopOffset = top + this._htmlElm.scrollTop;
      }
      window.addEventListener('scroll', this._onScroll);
      this._windowScrollListenerAdded = true;
    }
  }

  componentDidUpdate() {
    if (this._itemHolder) {
      this._scanItemHeights();
    }
  }

  componentWillUnmount() {
    if (this._windowScrollListenerAdded) {
      window.removeEventListener('scroll', this._onScroll);
    }
  }

  _onScroll() {
    if (!this._isScrolledOrResized) {
      this._isScrolledOrResized = true;
      window.requestAnimationFrame(this._positionList);
    }
  }

  _isViewChanged() {
    if (!this._wrapperElm) {
      return false;
    }
    const useRoot = this.props.windowScroller;
    const clientHeight = useRoot ? this._htmlElm.clientHeight : this._wrapperElm.clientHeight;
    const scrollTop = useRoot ? this._htmlElm.scrollTop : this._wrapperElm.scrollTop;
    return clientHeight !== this._viewHeight || scrollTop !== this._scrollTop;
  }

  _calcViewIndexes() {
    if (!this._wrapperElm) {
      this._viewHeight = null;
      this._startIndex = 0;
      this._endIndex = 0;
      return;
    }
    const useRoot = this.props.windowScroller;
    this._viewHeight = useRoot ? this._htmlElm.clientHeight : this._wrapperElm.clientHeight;
    this._scrollTop = useRoot ? this._htmlElm.scrollTop : this._wrapperElm.scrollTop;
    let yStart;
    let yEnd;
    if (useRoot) {
      if (this._scrollTop < this._htmlTopOffset) {
        yStart = 0;
        yEnd = this._viewHeight - this._htmlTopOffset + this._scrollTop;
      } else {
        yStart = this._scrollTop - this._htmlTopOffset;
        yEnd = yStart + this._viewHeight;
      }
    } else {
      yStart = this._scrollTop;
      yEnd = this._scrollTop + this._viewHeight;
    }
    this._startIndex = this.yPositions.findFloorIndex(yStart, this._getHeight);
    this._endIndex = this.yPositions.findFloorIndex(yEnd, this._getHeight);
  }

  _positionList() {
    this._isScrolledOrResized = false;
    if (!this._wrapperElm) {
      return;
    }
    this._calcViewIndexes();
    // indexes drawn should be padded by at least props.viewBufferMin
    const maxStart =
      this.props.viewBufferMin > this._startIndex ? 0 : this._startIndex - this.props.viewBufferMin;
    const minEnd =
      this.props.viewBufferMin < this.props.data.length - this._endIndex
        ? this._endIndex + this.props.viewBufferMin
        : this.props.data.length - 1;
    if (maxStart < this._startIndexDrawn || minEnd > this._endIndexDrawn) {
      // console.time('force update');
      // setTimeout(() => console.timeEnd('force update') || console.log('rawn', this._endIndexDrawn, minEnd), 0);
      this.forceUpdate();
    }
  }

  _initWrapper(elm) {
    this._wrapperElm = elm;
    this._viewHeight = elm && elm.clientHeight;
  }

  _initItemHolder(elm) {
    this._itemHolder = elm;
    if (elm) {
      this._scanItemHeights();
    }
  }

  _scanItemHeights() {
    const getIndexFromKey = this.props.getIndexFromKey || defaultGetIndexFromKey;
    let isDirty = false;
    let lowDirtyKey = null;
    let highDirtyKey = null;
    const nodes = this._itemHolder.childNodes;
    const max = nodes.length;
    for (let i = 0; i < max; i++) {
      const node = nodes[i];
      const itemKey = node.dataset.itemKey;
      if (!itemKey) {
        // eslint-disable-next-line no-console
        console.warn('itemKey not found');
        continue;
      }
      const observed = node.firstChild.scrollHeight;
      const known = this._knownHeights.get(itemKey);
      if (observed !== known) {
        this._knownHeights.set(itemKey, observed);
        if (!isDirty) {
          isDirty = true;
          // eslint-disable-next-line no-multi-assign
          lowDirtyKey = highDirtyKey = itemKey;
        } else {
          highDirtyKey = itemKey;
        }
      }
    }
    if (isDirty) {
      const imin = getIndexFromKey(lowDirtyKey);
      const imax = highDirtyKey === lowDirtyKey ? imin : getIndexFromKey(highDirtyKey);
      this.yPositions.calcHeights(imax, this._getHeight, imin);
      this.forceUpdate();
    }
  }

  _getHeight(i) {
    const key = (this.props.getKeyFromIndex || defaultGetKeyFromIndex)(i);
    const known = this._knownHeights.get(key);
    // known !== known iff known is NaN
    if (known != null && known === known) {
      return known;
    }
    return this.props.itemHeightGetter(i, key);
  }

  render() {
    const { data, itemRenderer, initialDraw, viewBuffer, viewBufferMin } = this.props;
    const items = [];

    const heightGetter = this._getHeight;
    const getKeyFromIndex = this.props.getKeyFromIndex || defaultGetKeyFromIndex;
    let start;
    let end;

    if (!this._wrapperElm) {
      start = 0;
      end = initialDraw < data.length ? initialDraw : data.length - 1;
    } else {
      if (this._isViewChanged()) {
        this._calcViewIndexes();
      }

      const maxStart = viewBufferMin > this._startIndex ? 0 : this._startIndex - viewBufferMin;
      const minEnd =
        viewBufferMin < data.length - this._endIndex ? this._endIndex + viewBufferMin : data.length - 1;
      if (maxStart < this._startIndexDrawn || minEnd > this._endIndexDrawn) {
        start = viewBuffer > this._startIndex ? 0 : this._startIndex - viewBuffer;
        end = this._endIndex + viewBuffer;
        if (end >= data.length) {
          end = data.length - 1;
        }
      } else {
        start = this._startIndexDrawn;
        end = this._endIndexDrawn > data.length - 1 ? data.length - 1 : this._endIndexDrawn;
      }
    }

    this.yPositions.profileData(data);
    this.yPositions.calcHeights(end, heightGetter, start || -1);
    this._startIndexDrawn = start;
    this._endIndexDrawn = end;

    items.length = end - start + 1;
    for (let i = start; i <= end; i++) {
      this.yPositions.confirmHeight(i, heightGetter);
      const style = {
        position: 'absolute',
        top: this.yPositions.ys[i],
        height: this.yPositions.heights[i],
        overflow: 'hidden',
      };
      const itemKey = getKeyFromIndex(i);
      const attrs = { 'data-item-key': itemKey };
      items.push(itemRenderer(itemKey, style, i, attrs));
    }

    const scrollerStyle = {
      position: 'relative',
      height: this.yPositions.getEstimatedHeight(),
    };
    const wrapperProps = {
      style: {
        overflowY: 'auto',
        position: 'relative',
        height: '100%',
      },
      ref: this._initWrapper,
    };
    if (!this.props.windowScroller) {
      wrapperProps.onScroll = this._onScroll;
    }
    return (
      <div {...wrapperProps}>
        <div style={scrollerStyle}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              margin: 0,
              padding: 0,
            }}
            className={this.props.itemsWrapperClassName}
            ref={this._initItemHolder}
          >
            {items}
          </div>
        </div>
      </div>
    );
  }
}

ListView.propTypes = {
  data: PropTypes.array.isRequired,
  initialDraw: PropTypes.number.isRequired,
  viewBuffer: PropTypes.number.isRequired,
  viewBufferMin: PropTypes.number.isRequired,
  itemHeightGetter: PropTypes.func,
  itemRenderer: PropTypes.oneOfType([PropTypes.element, PropTypes.func]).isRequired,
  itemsWrapperClassName: PropTypes.string,
  windowScroller: PropTypes.bool,
  getKeyFromIndex: PropTypes.func,
  getIndexFromKey: PropTypes.func,
};

ListView.defaultProps = {
  data: undefined,
  initialDraw: 300,
  viewBuffer: 90,
  viewBufferMin: 30,
  itemHeightGetter: undefined,
  itemRenderer: undefined,
  itemsWrapperClassName: '',
  windowScroller: false,
};
