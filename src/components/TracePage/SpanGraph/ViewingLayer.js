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

import GraphTicks from './GraphTicks';
import Scrubber from './Scrubber';
import type { ViewRange, ViewRangeTimeUpdate } from '../types';
import type { DraggableBounds, DraggingUpdate } from '../../../utils/DraggableManager';
import DraggableManager, { updateTypes } from '../../../utils/DraggableManager';

import './ViewingLayer.css';

type ViewingLayerProps = {
  height: number,
  numTicks: number,
  updateViewRange: (number, number) => void,
  updateNextViewRangeTime: ViewRangeTimeUpdate => void,
  viewRange: ViewRange,
};

type ViewingLayerState = {
  cursorX: ?number,
  preventCursorLine: boolean,
};

const dragTypes = {
  SHIFT_END: 'SHIFT_END',
  SHIFT_START: 'SHIFT_START',
  REFRAME: 'REFRAME',
};

function getNextViewLayout(start: number, position: number) {
  const [left, right] = start < position ? [start, position] : [position, start];
  return {
    x: `${left * 100}%`,
    width: `${(right - left) * 100}%`,
    leadingX: `${position * 100}%`,
  };
}

export default class ViewingLayer extends React.PureComponent<ViewingLayerProps, ViewingLayerState> {
  props: ViewingLayerProps;
  state: ViewingLayerState;

  _root: ?Element;
  _draggerReframe: DraggableManager;
  _draggerStart: DraggableManager;
  _draggerEnd: DraggableManager;

  constructor(props: ViewingLayerProps) {
    super(props);
    this._setRoot = this._setRoot.bind(this);
    this._getDraggingBounds = this._getDraggingBounds.bind(this);
    this._handleReframeMouseMove = this._handleReframeMouseMove.bind(this);
    this._handleReframeMouseLeave = this._handleReframeMouseLeave.bind(this);
    this._handleReframeDragUpdate = this._handleReframeDragUpdate.bind(this);
    this._handleReframeDragEnd = this._handleReframeDragEnd.bind(this);
    this._handleScrubberEnterLeave = this._handleScrubberEnterLeave.bind(this);
    this._handleScrubberDragUpdate = this._handleScrubberDragUpdate.bind(this);
    this._handleScrubberDragEnd = this._handleScrubberDragEnd.bind(this);

    this._draggerReframe = new DraggableManager(this._getDraggingBounds, dragTypes.REFRAME);
    this._draggerReframe.onMouseMove = this._handleReframeMouseMove;
    this._draggerReframe.onMouseLeave = this._handleReframeMouseLeave;
    this._draggerReframe.onDragStart = this._handleReframeDragUpdate;
    this._draggerReframe.onDragMove = this._handleReframeDragUpdate;
    this._draggerReframe.onDragEnd = this._handleReframeDragEnd;

    this._draggerStart = new DraggableManager(this._getDraggingBounds, dragTypes.SHIFT_START);
    this._draggerStart.onMouseEnter = this._handleScrubberEnterLeave;
    this._draggerStart.onMouseLeave = this._handleScrubberEnterLeave;
    this._draggerStart.onDragStart = this._handleScrubberDragUpdate;
    this._draggerStart.onDragMove = this._handleScrubberDragUpdate;
    this._draggerStart.onDragEnd = this._handleScrubberDragEnd;

    this._draggerEnd = new DraggableManager(this._getDraggingBounds, dragTypes.SHIFT_END);
    this._draggerEnd.onMouseEnter = this._handleScrubberEnterLeave;
    this._draggerEnd.onMouseLeave = this._handleScrubberEnterLeave;
    this._draggerEnd.onDragStart = this._handleScrubberDragUpdate;
    this._draggerEnd.onDragMove = this._handleScrubberDragUpdate;
    this._draggerEnd.onDragEnd = this._handleScrubberDragEnd;

    this._root = undefined;
    this.state = {
      cursorX: undefined,
      preventCursorLine: false,
    };
  }

  componentWillUnmount() {
    this._draggerReframe.dispose();
    this._draggerEnd.dispose();
    this._draggerStart.dispose();
  }

  _setRoot = function _setRoot(elm: ?Element) {
    this._root = elm;
  };

  _getDraggingBounds = function _getDraggingBounds(tag: ?string): DraggableBounds {
    if (!this._root) {
      throw new Error('invalid state');
    }
    const { left: clientXLeft, width } = this._root.getBoundingClientRect();
    const [viewStart, viewEnd] = this.props.viewRange.time.current;
    let maxValue = 1;
    let minValue = 0;
    if (tag === dragTypes.SHIFT_START) {
      maxValue = viewEnd;
    } else if (tag === dragTypes.SHIFT_END) {
      minValue = viewStart;
    }
    return { clientXLeft, maxValue, minValue, width };
  };

  _handleReframeMouseMove = function _handleReframeMouseMove({ x }: DraggingUpdate) {
    this.setState({ cursorX: x });
  };

  _handleReframeMouseLeave = function _handleReframeMouseLeave() {
    this.setState({ cursorX: undefined });
  };

  _handleReframeDragUpdate = function _handleReframeDragUpdate({ value }: DraggingUpdate) {
    const shift = value;
    const { time } = this.props.viewRange;
    const anchor = time.reframe ? time.reframe.anchor : shift;
    const update = { reframe: { anchor, shift } };
    this.props.updateNextViewRangeTime(update);
  };

  _handleReframeDragEnd = function _handleReframeDragEnd({ manager, value }: DraggingUpdate) {
    const { time } = this.props.viewRange;
    const anchor = time.reframe ? time.reframe.anchor : value;
    const [start, end] = value < anchor ? [value, anchor] : [anchor, value];
    manager.resetBounds();
    this.props.updateViewRange(start, end);
  };

  _handleScrubberEnterLeave = function _handleScrubberEnterLeave({ type }: DraggingUpdate) {
    const preventCursorLine = type === updateTypes.MOUSE_ENTER;
    this.setState({ preventCursorLine });
  };

  _handleScrubberDragUpdate = function _handleScrubberDragUpdate({
    event,
    tag,
    type,
    value,
  }: DraggingUpdate) {
    if (type === updateTypes.DRAG_START) {
      event.stopPropagation();
    }
    const update = {};
    if (tag === dragTypes.SHIFT_START) {
      update.shiftStart = value;
    } else if (tag === dragTypes.SHIFT_END) {
      update.shiftEnd = value;
    }
    this.props.updateNextViewRangeTime(update);
  };

  _handleScrubberDragEnd = function _handleScrubberDragEnd({ manager, tag, value }: DraggingUpdate) {
    const [viewStart, viewEnd] = this.props.viewRange.time.current;
    let update: [number, number];
    if (tag === dragTypes.SHIFT_START) {
      update = [value, viewEnd];
    } else if (tag === dragTypes.SHIFT_END) {
      update = [viewStart, value];
    }
    manager.resetBounds();
    this.setState({ preventCursorLine: false });
    this.props.updateViewRange(...update);
  };

  _getMarkers(from: number, to: number, isShift: boolean) {
    const layout = getNextViewLayout(from, to);
    const cls = cx({
      isShiftDrag: isShift,
      isReframeDrag: !isShift,
    });
    return [
      <rect
        key="fill"
        className={`ViewingLayer--draggedShift ${cls}`}
        x={layout.x}
        y="0"
        width={layout.width}
        height={this.props.height - 2}
      />,
      <rect
        key="edge"
        className={`ViewingLayer--draggedEdge ${cls}`}
        x={layout.leadingX}
        y="0"
        width="1"
        height={this.props.height - 2}
      />,
    ];
  }

  render() {
    const { height, viewRange, numTicks } = this.props;
    const { cursorX, preventCursorLine } = this.state;
    const { current, shiftStart, shiftEnd, reframe } = viewRange.time;
    const haveNextTimeRange = shiftStart != null || shiftEnd != null || reframe != null;
    const [viewStart, viewEnd] = current;
    let leftInactive = 0;
    if (viewStart) {
      leftInactive = viewStart * 100;
    }
    let rightInactive = 100;
    if (viewEnd) {
      rightInactive = 100 - viewEnd * 100;
    }
    const drawCursor = !haveNextTimeRange && cursorX != null && !preventCursorLine;

    return (
      <div aria-hidden className="ViewingLayer" style={{ height }}>
        <svg
          height={height}
          style={{ shapeRendering: 'crispEdges' }}
          className="ViewingLayer--graph"
          ref={this._setRoot}
          onMouseDown={this._draggerReframe.handleMouseDown}
          onMouseLeave={this._draggerReframe.handleMouseLeave}
          onMouseMove={this._draggerReframe.handleMouseMove}
        >
          {leftInactive > 0 &&
            <rect x={0} y={0} height="100%" width={`${leftInactive}%`} className="ViewingLayer--inactive" />}
          {rightInactive < 100 &&
            <rect
              x={`${100 - rightInactive}%`}
              y={0}
              height="100%"
              width={`${rightInactive}%`}
              className="ViewingLayer--inactive"
            />}
          <GraphTicks numTicks={numTicks} />
          {drawCursor &&
            <line
              className="ViewingLayer--cursorGuide"
              x1={cursorX}
              y1="0"
              x2={cursorX}
              y2={height - 2}
              strokeWidth="1"
            />}
          {shiftStart != null && this._getMarkers(viewStart, shiftStart, true)}
          {shiftEnd != null && this._getMarkers(viewEnd, shiftEnd, true)}
          <Scrubber
            isDragging={shiftStart != null}
            onMouseDown={this._draggerStart.handleMouseDown}
            onMouseEnter={this._draggerStart.handleMouseEnter}
            onMouseLeave={this._draggerStart.handleMouseLeave}
            position={viewStart || 0}
          />
          <Scrubber
            isDragging={shiftEnd != null}
            position={viewEnd || 1}
            onMouseDown={this._draggerEnd.handleMouseDown}
            onMouseEnter={this._draggerEnd.handleMouseEnter}
            onMouseLeave={this._draggerEnd.handleMouseLeave}
          />
          {reframe != null && this._getMarkers(reframe.anchor, reframe.shift, false)}
        </svg>
        {haveNextTimeRange && <div className="ViewingLayer--fullOverlay" />}
      </div>
    );
  }
}
