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
  updateViewRangeTime: (number, number) => void,
  updateNextViewRangeTime: ViewRangeTimeUpdate => void,
  viewRange: ViewRange,
};

type ViewingLayerState = {
  /**
   * Cursor line should not be drawn when the mouse is over the scrubber handle.
   */
  preventCursorLine: boolean,
};

/**
 * Designate the tags for the different dragging managers. Exported for tests.
 */
export const dragTypes = {
  /**
   * Tag for dragging the right scrubber, e.g. end of the current view range.
   */
  SHIFT_END: 'SHIFT_END',
  /**
   * Tag for dragging the left scrubber, e.g. start of the current view range.
   */
  SHIFT_START: 'SHIFT_START',
  /**
   * Tag for dragging a new view range.
   */
  REFRAME: 'REFRAME',
};

/**
 * Returns the layout information for drawing the view-range differential, e.g.
 * show what will change when the mouse is released. Basically, this is the
 * difference from the start of the drag to the current position.
 *
 * @returns {{ x: string, width: string, leadginX: string }}
 */
function getNextViewLayout(start: number, position: number) {
  const [left, right] = start < position ? [start, position] : [position, start];
  return {
    x: `${left * 100}%`,
    width: `${(right - left) * 100}%`,
    leadingX: `${position * 100}%`,
  };
}

/**
 * `ViewingLayer` is rendered on top of the Canvas rendering of the minimap and
 * handles showing the current view range and handles mouse UX for modifying it.
 */
export default class ViewingLayer extends React.PureComponent<ViewingLayerProps, ViewingLayerState> {
  props: ViewingLayerProps;
  state: ViewingLayerState;

  _root: ?Element;

  /**
   * `_draggerReframe` handles clicking and dragging on the `ViewingLayer` to
   * redefined the view range.
   */
  _draggerReframe: DraggableManager;

  /**
   * `_draggerStart` handles dragging the left scrubber to adjust the start of
   * the view range.
   */
  _draggerStart: DraggableManager;

  /**
   * `_draggerEnd` handles dragging the right scrubber to adjust the end of
   * the view range.
   */
  _draggerEnd: DraggableManager;

  constructor(props: ViewingLayerProps) {
    super(props);

    this._draggerReframe = new DraggableManager({
      getBounds: this._getDraggingBounds,
      onDragEnd: this._handleReframeDragEnd,
      onDragMove: this._handleReframeDragUpdate,
      onDragStart: this._handleReframeDragUpdate,
      onMouseMove: this._handleReframeMouseMove,
      onMouseLeave: this._handleReframeMouseLeave,
      tag: dragTypes.REFRAME,
    });

    this._draggerStart = new DraggableManager({
      getBounds: this._getDraggingBounds,
      onDragEnd: this._handleScrubberDragEnd,
      onDragMove: this._handleScrubberDragUpdate,
      onDragStart: this._handleScrubberDragUpdate,
      onMouseEnter: this._handleScrubberEnterLeave,
      onMouseLeave: this._handleScrubberEnterLeave,
      tag: dragTypes.SHIFT_START,
    });

    this._draggerEnd = new DraggableManager({
      getBounds: this._getDraggingBounds,
      onDragEnd: this._handleScrubberDragEnd,
      onDragMove: this._handleScrubberDragUpdate,
      onDragStart: this._handleScrubberDragUpdate,
      onMouseEnter: this._handleScrubberEnterLeave,
      onMouseLeave: this._handleScrubberEnterLeave,
      tag: dragTypes.SHIFT_END,
    });

    this._root = undefined;
    this.state = {
      preventCursorLine: false,
    };
  }

  componentWillUnmount() {
    this._draggerReframe.dispose();
    this._draggerEnd.dispose();
    this._draggerStart.dispose();
  }

  _setRoot = (elm: ?Element) => {
    this._root = elm;
  };

  _getDraggingBounds = (tag: ?string): DraggableBounds => {
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

  _handleReframeMouseMove = ({ value }: DraggingUpdate) => {
    this.props.updateNextViewRangeTime({ cursor: value });
  };

  _handleReframeMouseLeave = () => {
    this.props.updateNextViewRangeTime({ cursor: null });
  };

  _handleReframeDragUpdate = ({ value }: DraggingUpdate) => {
    const shift = value;
    const { time } = this.props.viewRange;
    const anchor = time.reframe ? time.reframe.anchor : shift;
    const update = { reframe: { anchor, shift } };
    this.props.updateNextViewRangeTime(update);
  };

  _handleReframeDragEnd = ({ manager, value }: DraggingUpdate) => {
    const { time } = this.props.viewRange;
    const anchor = time.reframe ? time.reframe.anchor : value;
    const [start, end] = value < anchor ? [value, anchor] : [anchor, value];
    manager.resetBounds();
    this.props.updateViewRangeTime(start, end);
  };

  _handleScrubberEnterLeave = ({ type }: DraggingUpdate) => {
    const preventCursorLine = type === updateTypes.MOUSE_ENTER;
    this.setState({ preventCursorLine });
  };

  _handleScrubberDragUpdate = ({ event, tag, type, value }: DraggingUpdate) => {
    if (type === updateTypes.DRAG_START) {
      event.stopPropagation();
    }
    if (tag === dragTypes.SHIFT_START) {
      this.props.updateNextViewRangeTime({ shiftStart: value });
    } else if (tag === dragTypes.SHIFT_END) {
      this.props.updateNextViewRangeTime({ shiftEnd: value });
    }
  };

  _handleScrubberDragEnd = ({ manager, tag, value }: DraggingUpdate) => {
    const [viewStart, viewEnd] = this.props.viewRange.time.current;
    let update: [number, number];
    if (tag === dragTypes.SHIFT_START) {
      update = [value, viewEnd];
    } else if (tag === dragTypes.SHIFT_END) {
      update = [viewStart, value];
    } else {
      // to satisfy flow
      throw new Error('bad state');
    }
    manager.resetBounds();
    this.setState({ preventCursorLine: false });
    this.props.updateViewRangeTime(...update);
  };

  /**
   * Randers the difference between where the drag started and the current
   * position, e.g. the red or blue highlight.
   *
   * @returns React.Node[]
   */
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
    const { preventCursorLine } = this.state;
    const { current, cursor, shiftStart, shiftEnd, reframe } = viewRange.time;
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
    let cursorPosition: ?string;
    if (!haveNextTimeRange && cursor != null && !preventCursorLine) {
      cursorPosition = `${cursor * 100}%`;
    }

    return (
      <div aria-hidden className="ViewingLayer" style={{ height }}>
        <svg
          height={height}
          className="ViewingLayer--graph"
          ref={this._setRoot}
          onMouseDown={this._draggerReframe.handleMouseDown}
          onMouseLeave={this._draggerReframe.handleMouseLeave}
          onMouseMove={this._draggerReframe.handleMouseMove}
        >
          {leftInactive > 0 &&
            <rect x={0} y={0} height="100%" width={`${leftInactive}%`} className="ViewingLayer--inactive" />}
          {rightInactive > 0 &&
            <rect
              x={`${100 - rightInactive}%`}
              y={0}
              height="100%"
              width={`${rightInactive}%`}
              className="ViewingLayer--inactive"
            />}
          <GraphTicks numTicks={numTicks} />
          {cursorPosition &&
            <line
              className="ViewingLayer--cursorGuide"
              x1={cursorPosition}
              y1="0"
              x2={cursorPosition}
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
        {/* fullOverlay updates the mouse cursor blocks mouse events */}
        {haveNextTimeRange && <div className="ViewingLayer--fullOverlay" />}
      </div>
    );
  }
}
