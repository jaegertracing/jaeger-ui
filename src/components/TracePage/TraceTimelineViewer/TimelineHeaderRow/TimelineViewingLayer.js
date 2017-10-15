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
  boundsInvalidator: ?any,
  updateNextViewRangeTime: ViewRangeTimeUpdate => void,
  updateViewRange: (number, number) => void,
  viewRangeTime: ViewRangeTime,
};

function mapFromViewSubRange(viewStart, viewEnd, value) {
  return viewStart + value * (viewEnd - viewStart);
}

function mapToViewSubRange(viewStart, viewEnd, value) {
  return (value - viewStart) / (viewEnd - viewStart);
}

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

function getMarkers(viewStart: number, viewEnd: number, from: number, to: number, isShift: boolean) {
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

export default class TimelineViewingLayer extends React.PureComponent<TimelineViewingLayerProps> {
  props: TimelineViewingLayerProps;

  _root: ?Element;
  _draggerReframe: DraggableManager;

  constructor(props: TimelineViewingLayerProps) {
    super(props);
    this._setRoot = this._setRoot.bind(this);
    this._getDraggingBounds = this._getDraggingBounds.bind(this);
    this._handleReframeMouseMove = this._handleReframeMouseMove.bind(this);
    this._handleReframeMouseLeave = this._handleReframeMouseLeave.bind(this);
    this._handleReframeDragUpdate = this._handleReframeDragUpdate.bind(this);
    this._handleReframeDragEnd = this._handleReframeDragEnd.bind(this);

    this._draggerReframe = new DraggableManager(this._getDraggingBounds);
    this._draggerReframe.onMouseMove = this._handleReframeMouseMove;
    this._draggerReframe.onMouseLeave = this._handleReframeMouseLeave;
    this._draggerReframe.onDragStart = this._handleReframeDragUpdate;
    this._draggerReframe.onDragMove = this._handleReframeDragUpdate;
    this._draggerReframe.onDragEnd = this._handleReframeDragEnd;

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

  _setRoot = function _setRoot(elm: ?Element) {
    this._root = elm;
  };

  _getDraggingBounds = function _getDraggingBounds(): DraggableBounds {
    if (!this._root) {
      throw new Error('invalid state');
    }
    const { left: clientXLeft, width } = this._root.getBoundingClientRect();
    return { clientXLeft, width };
  };

  _handleReframeMouseMove = function _handleReframeMouseMove({ value }: DraggingUpdate) {
    const [viewStart, viewEnd] = this.props.viewRangeTime.current;
    const cursor = mapFromViewSubRange(viewStart, viewEnd, value);
    this.props.updateNextViewRangeTime({ cursor });
  };

  _handleReframeMouseLeave = function _handleReframeMouseLeave() {
    this.props.updateNextViewRangeTime({ cursor: undefined });
  };

  _handleReframeDragUpdate = function _handleReframeDragUpdate({ value }: DraggingUpdate) {
    const { current, reframe } = this.props.viewRangeTime;
    const [viewStart, viewEnd] = current;
    const shift = mapFromViewSubRange(viewStart, viewEnd, value);
    const anchor = reframe ? reframe.anchor : shift;
    const update = { reframe: { anchor, shift } };
    this.props.updateNextViewRangeTime(update);
  };

  _handleReframeDragEnd = function _handleReframeDragEnd({ manager, value }: DraggingUpdate) {
    const { current, reframe } = this.props.viewRangeTime;
    const [viewStart, viewEnd] = current;
    const shift = mapFromViewSubRange(viewStart, viewEnd, value);
    const anchor = reframe ? reframe.anchor : shift;
    const [start, end] = shift < anchor ? [shift, anchor] : [anchor, shift];
    manager.resetBounds();
    this.props.updateViewRange(start, end);
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
