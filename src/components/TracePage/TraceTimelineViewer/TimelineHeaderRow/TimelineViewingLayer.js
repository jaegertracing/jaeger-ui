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

import * as React from 'react';
import cx from 'classnames';

import type { ViewRangeTime, ViewRangeTimeUpdate } from '../../types';
import type { DraggableBounds, DraggingUpdate } from '../../../../utils/DraggableManager';
import DraggableManager from '../../../../utils/DraggableManager';

import './TimelineViewingLayer.css';

type TimelineViewingLayerProps = {
  /**
   * `boundsInvalidator` is an arbitrary prop that lets the component know the
   * bounds for dragging need to be recalculated. In practice, the name column
   * width serves fine for this.
   */
  boundsInvalidator: ?any,
  updateNextViewRangeTime: ViewRangeTimeUpdate => void,
  updateViewRangeTime: (number, number) => void,
  viewRangeTime: ViewRangeTime,
};

/**
 * Map from a sub range to the greater view range, e.g, when the view range is
 * the middle half ([0.25, 0.75]), a value of 0.25 befomes 3/8.
 * @returns {number}
 */
function mapFromViewSubRange(viewStart, viewEnd, value) {
  return viewStart + value * (viewEnd - viewStart);
}

/**
 * Map a value from the view ([0, 1]) to a sub-range, e.g, when the view range is
 * the middle half ([0.25, 0.75]), a value of 3/8 becomes 1/4.
 * @returns {number}
 */
function mapToViewSubRange(viewStart, viewEnd, value) {
  return (value - viewStart) / (viewEnd - viewStart);
}

/**
 * Get the layout for the "next" view range time, e.g. the difference from the
 * drag start and the drag end. This is driven by `shiftStart`, `shiftEnd` or
 * `reframe` on `props.viewRangeTime`, not by the current state of the
 * component. So, it reflects in-progress dragging from the span minimap.
 */
function getNextViewLayout(
  start: number,
  position: number
): { isDraggingLeft: boolean, left: string, width: string } | { isOutOfView: true } {
  let [left, right] = start < position ? [start, position] : [position, start];
  if (left >= 1 || right <= 0) {
    return { isOutOfView: true };
  }
  if (left < 0) {
    left = 0;
  }
  if (right > 1) {
    right = 1;
  }
  return {
    isDraggingLeft: start > position,
    left: `${left * 100}%`,
    width: `${(right - left) * 100}%`,
  };
}

/**
 * Render the visual indication of the "next" view range.
 */
function getMarkers(
  viewStart: number,
  viewEnd: number,
  from: number,
  to: number,
  isShift: boolean
): React.Node {
  const mappedFrom = mapToViewSubRange(viewStart, viewEnd, from);
  const mappedTo = mapToViewSubRange(viewStart, viewEnd, to);
  const layout = getNextViewLayout(mappedFrom, mappedTo);
  if (layout.isOutOfView) {
    return null;
  }
  const { isDraggingLeft, left, width } = layout;
  const cls = cx({
    isDraggingLeft,
    isDraggingRight: !isDraggingLeft,
    isReframeDrag: !isShift,
    isShiftDrag: isShift,
  });
  return <div className={`TimelineViewingLayer--dragged ${cls}`} style={{ left, width }} />;
}

/**
 * `TimelineViewingLayer` is rendered on top of the TimelineHeaderRow time
 * labels; it handles showing the current view range and handles mouse UX for
 * modifying it.
 */
export default class TimelineViewingLayer extends React.PureComponent<TimelineViewingLayerProps> {
  props: TimelineViewingLayerProps;

  _draggerReframe: DraggableManager;
  _root: ?Element;

  constructor(props: TimelineViewingLayerProps) {
    super(props);
    this._draggerReframe = new DraggableManager({
      getBounds: this._getDraggingBounds,
      onDragEnd: this._handleReframeDragEnd,
      onDragMove: this._handleReframeDragUpdate,
      onDragStart: this._handleReframeDragUpdate,
      onMouseLeave: this._handleReframeMouseLeave,
      onMouseMove: this._handleReframeMouseMove,
    });
    this._root = undefined;
  }

  componentWillReceiveProps(nextProps: TimelineViewingLayerProps) {
    const { boundsInvalidator } = this.props;
    if (boundsInvalidator !== nextProps.boundsInvalidator) {
      this._draggerReframe.resetBounds();
    }
  }

  componentWillUnmount() {
    this._draggerReframe.dispose();
  }

  _setRoot = (elm: ?Element) => {
    this._root = elm;
  };

  _getDraggingBounds = (): DraggableBounds => {
    if (!this._root) {
      throw new Error('invalid state');
    }
    const { left: clientXLeft, width } = this._root.getBoundingClientRect();
    return { clientXLeft, width };
  };

  _handleReframeMouseMove = ({ value }: DraggingUpdate) => {
    const [viewStart, viewEnd] = this.props.viewRangeTime.current;
    const cursor = mapFromViewSubRange(viewStart, viewEnd, value);
    this.props.updateNextViewRangeTime({ cursor });
  };

  _handleReframeMouseLeave = () => {
    this.props.updateNextViewRangeTime({ cursor: undefined });
  };

  _handleReframeDragUpdate = ({ value }: DraggingUpdate) => {
    const { current, reframe } = this.props.viewRangeTime;
    const [viewStart, viewEnd] = current;
    const shift = mapFromViewSubRange(viewStart, viewEnd, value);
    const anchor = reframe ? reframe.anchor : shift;
    const update = { reframe: { anchor, shift } };
    this.props.updateNextViewRangeTime(update);
  };

  _handleReframeDragEnd = ({ manager, value }: DraggingUpdate) => {
    const { current, reframe } = this.props.viewRangeTime;
    const [viewStart, viewEnd] = current;
    const shift = mapFromViewSubRange(viewStart, viewEnd, value);
    const anchor = reframe ? reframe.anchor : shift;
    const [start, end] = shift < anchor ? [shift, anchor] : [anchor, shift];
    manager.resetBounds();
    this.props.updateViewRangeTime(start, end);
  };

  render() {
    const { viewRangeTime } = this.props;
    const { current, cursor, reframe, shiftEnd, shiftStart } = viewRangeTime;
    const [viewStart, viewEnd] = current;
    const haveNextTimeRange = reframe != null || shiftEnd != null || shiftStart != null;
    let cusrorPosition: ?string;
    if (!haveNextTimeRange && cursor != null && cursor >= viewStart && cursor <= viewEnd) {
      cusrorPosition = `${mapToViewSubRange(viewStart, viewEnd, cursor) * 100}%`;
    }
    return (
      <div
        aria-hidden
        className="TimelineViewingLayer"
        ref={this._setRoot}
        onMouseDown={this._draggerReframe.handleMouseDown}
        onMouseLeave={this._draggerReframe.handleMouseLeave}
        onMouseMove={this._draggerReframe.handleMouseMove}
      >
        {cusrorPosition != null &&
          <div className="TimelineViewingLayer--cursorGuide" style={{ left: cusrorPosition }} />}
        {reframe != null && getMarkers(viewStart, viewEnd, reframe.anchor, reframe.shift, false)}
        {shiftEnd != null && getMarkers(viewStart, viewEnd, viewEnd, shiftEnd, true)}
        {shiftStart != null && getMarkers(viewStart, viewEnd, viewStart, shiftStart, true)}
      </div>
    );
  }
}
