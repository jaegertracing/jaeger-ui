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

import type { Span, Trace } from '../../types';

export type Accessors = {
  getViewRange: () => [number, number],
  getSearchedSpanIDs: () => ?Set<string>,
  getCollapsedChildren: () => ?Set<string>,
  getViewHeight: () => number,
  getBottomRowIndexVisible: () => number,
  getTopRowIndexVisible: () => number,
  getRowPosition: number => { height: number, y: number },
  mapRowIndexToSpanIndex: number => number,
  mapSpanIndexToRowIndex: number => number,
};

interface Scroller {
  scrollTo: number => void,
  scrollBy: number => void,
}

function isSpanHidden(span: Span, childrenAreHidden: Set<string>, spansMap: Map<string, ?Span>) {
  const parentIDs = new Set();
  let { references } = span;
  let parentID: ?string;
  const checkRef = ref => {
    if (ref.refType === 'CHILD_OF') {
      parentID = ref.spanID;
      parentIDs.add(parentID);
      return childrenAreHidden.has(parentID);
    }
    return false;
  };
  while (Array.isArray(references) && references.length) {
    const isHidden = references.some(checkRef);
    if (isHidden) {
      return { isHidden, parentIDs };
    }
    if (!parentID) {
      break;
    }
    const parent = spansMap.get(parentID);
    parentID = undefined;
    references = parent && parent.references;
  }
  return { parentIDs, isHidden: false };
}

export default class ScrollManager {
  _trace: ?Trace;
  _scroller: Scroller;
  _accessors: ?Accessors;

  constructor(trace: ?Trace, scroller: Scroller) {
    this._trace = trace;
    this._scroller = scroller;
    this._accessors = undefined;

    this.scrollToNextVisibleSpan = this.scrollToNextVisibleSpan.bind(this);
    this.scrollToPrevVisibleSpan = this.scrollToPrevVisibleSpan.bind(this);
    this.scrollPageDown = this.scrollPageDown.bind(this);
    this.scrollPageUp = this.scrollPageUp.bind(this);
    this.setAccessors = this.setAccessors.bind(this);
  }

  _scrollPast(rowIndex: number, direction: 1 | -1) {
    const xrs = this._accessors;
    if (!xrs) {
      throw new Error('Accessors not set');
    }
    const isUp = direction < 0;
    const position = xrs.getRowPosition(rowIndex);
    if (!position) {
      console.warn('Invalid row index');
      return;
    }
    let { y } = position;
    const vh = xrs.getViewHeight();
    if (!isUp) {
      y += position.height;
      // scrollTop is based on the top of the window
      y -= vh;
    }
    y += direction * 0.5 * vh;
    this._scroller.scrollTo(y);
  }

  _scrollToVisibleSpan(direction: 1 | -1) {
    const xrs = this._accessors;
    if (!xrs) {
      throw new Error('Accessors not set');
    }
    if (!this._trace) {
      return;
    }
    const { duration, spans, startTime: traceStartTime } = this._trace;
    const isUp = direction < 0;
    const boundaryRow = isUp ? xrs.getTopRowIndexVisible() : xrs.getBottomRowIndexVisible();
    const spanIndex = xrs.mapRowIndexToSpanIndex(boundaryRow);
    if ((spanIndex === 0 && isUp) || (spanIndex === spans.length - 1 && !isUp)) {
      return;
    }
    // fullViewSpanIndex is one row inside the view window unless already at the top or bottom
    let fullViewSpanIndex = spanIndex;
    if (spanIndex !== 0 && spanIndex !== spans.length - 1) {
      fullViewSpanIndex -= direction;
    }
    const [viewStart, viewEnd] = xrs.getViewRange();
    const checkVisibility = viewStart !== 0 || viewEnd !== 1;
    // use NaN as fallback to make flow happy
    const startTime = checkVisibility ? traceStartTime + duration * viewStart : NaN;
    const endTime = checkVisibility ? traceStartTime + duration * viewEnd : NaN;
    const findMatches = xrs.getSearchedSpanIDs();
    const _collapsed = xrs.getCollapsedChildren();
    const childrenAreHidden = _collapsed ? new Set(_collapsed) : null;
    // use empty Map as fallback to make flow happy
    const spansMap = childrenAreHidden ? new Map(spans.map(s => [s.spanID, s])) : new Map();
    const boundary = direction < 0 ? -1 : spans.length;
    let nextSpanIndex: number;
    for (let i = fullViewSpanIndex + direction; i !== boundary; i += direction) {
      const span = spans[i];
      const { duration: spanDuration, spanID, startTime: spanStartTime } = span;
      const spanEndTime = spanStartTime + spanDuration;
      if (checkVisibility && (spanStartTime > endTime || spanEndTime < startTime)) {
        // span is not visible within the view range
        continue;
      }
      if (findMatches && !findMatches.has(spanID)) {
        // skip to search matches (when searching)
        continue;
      }
      if (childrenAreHidden) {
        // make sure the span is not collapsed
        const { isHidden, parentIDs } = isSpanHidden(span, childrenAreHidden, spansMap);
        if (isHidden) {
          childrenAreHidden.add(...parentIDs);
          continue;
        }
      }
      nextSpanIndex = i;
      break;
    }
    if (!nextSpanIndex || nextSpanIndex === boundary) {
      // might as well scroll to the top or bottom
      nextSpanIndex = boundary - direction;
    }
    const nextRow = xrs.mapSpanIndexToRowIndex(nextSpanIndex);
    this._scrollPast(nextRow, direction);
  }

  setTrace(trace: ?Trace) {
    this._trace = trace;
  }

  setAccessors = function setAccessors(accessors: Accessors) {
    this._accessors = accessors;
  };

  scrollPageDown = function scrollPageDown() {
    if (!this._scroller || !this._accessors) {
      return;
    }
    this._scroller.scrollBy(0.95 * this._accessors.getViewHeight(), true);
  };

  scrollPageUp = function scrollPageUp() {
    if (!this._scroller || !this._accessors) {
      return;
    }
    this._scroller.scrollBy(-0.95 * this._accessors.getViewHeight(), true);
  };

  scrollToNextVisibleSpan = function scrollToNextVisibleSpan() {
    this._scrollToVisibleSpan(1);
  };

  scrollToPrevVisibleSpan = function scrollToPrevVisibleSpan() {
    this._scrollToVisibleSpan(-1);
  };

  destroy() {
    this._trace = undefined;
    this._scroller = (undefined: any);
    this._accessors = undefined;
  }
}
