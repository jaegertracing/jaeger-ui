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
import _clamp from 'lodash/clamp';

import GraphTicks from './GraphTicks';
import Scrubber from './Scrubber';
import type { ViewRange, ViewRangeTimeUpdate } from '../types';

import './ViewingLayer.css';

type DragType = 'SHIFT_END' | 'SHIFT_START' | 'REFRAME';

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

const LEFT_MOUSE_BUTTON = 0;

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
  _rootClientRect: ?ClientRect;
  _windowListenersAttached: boolean;
  _currentDragType: ?DragType;
  _handleLeftScrubberMouseDown: (SyntheticMouseEvent<any>) => void;
  _handleRightScrubberMouseDown: (SyntheticMouseEvent<any>) => void;

  constructor(props: ViewingLayerProps) {
    super(props);
    this._setRoot = this._setRoot.bind(this);
    this._handleScrubberMouseEnter = this._handleScrubberMouseEnter.bind(this);
    this._handleScrubberMouseLeave = this._handleScrubberMouseLeave.bind(this);
    this._handleLeftScrubberMouseDown = (event: SyntheticMouseEvent<any>) => {
      this._handleScrubberMouseDown(dragTypes.SHIFT_START, event);
    };
    this._handleRightScrubberMouseDown = (event: SyntheticMouseEvent<any>) => {
      this._handleScrubberMouseDown(dragTypes.SHIFT_END, event);
    };
    this._handleRootMouseMove = this._handleRootMouseMove.bind(this);
    this._handleRootMouseLeave = this._handleRootMouseLeave.bind(this);
    this._handleRootMouseDown = this._handleRootMouseDown.bind(this);
    this._handleWindowMouseMove = this._handleWindowMouseMove.bind(this);
    this._handleWindowMouseUp = this._handleWindowMouseUp.bind(this);

    this.state = {
      cursorX: undefined,
      preventCursorLine: false,
    };
    this._root = undefined;
    this._rootClientRect = undefined;
    this._windowListenersAttached = false;
    this._currentDragType = undefined;
  }

  _setRoot = function _setRoot(elm: ?Element) {
    this._root = elm;
    if (elm) {
      this._rootClientRect = elm.getBoundingClientRect();
    } else {
      this._rootClientRect = undefined;
    }
  };

  _getUpdate(clientX: number, type: DragType): ViewRangeTimeUpdate {
    if (!this._rootClientRect) {
      throw new Error('Invalid program state, cannot update view range');
    }
    const position = (clientX - this._rootClientRect.left) / (this._rootClientRect.width || 1);
    const { time } = this.props.viewRange;
    if (type === dragTypes.REFRAME) {
      const shift = _clamp(position, 0, 1);
      const anchor = time.reframe ? time.reframe.anchor : shift;
      return { reframe: { anchor, shift } };
    }
    if (type === dragTypes.SHIFT_START) {
      const [, endView] = time.current;
      const value = _clamp(position, 0, endView);
      return { shiftStart: value };
    }
    if (type === dragTypes.SHIFT_END) {
      const [startView] = time.current;
      const value = _clamp(position, startView, 1);
      return { shiftEnd: value };
    }
    throw new Error(`invalid drag type: ${type}`);
  }

  _handleScrubberMouseEnter = function _handleScrubberMouseEnter() {
    this.setState({ preventCursorLine: true });
  };

  _handleScrubberMouseLeave = function _handleScrubberMouseLeave() {
    this.setState({ preventCursorLine: false });
  };

  _handleScrubberMouseDown(type: DragType, event: SyntheticMouseEvent<any>) {
    const { button, clientX } = event;
    if (button !== LEFT_MOUSE_BUTTON) {
      return;
    }
    // stop propagation so the root mousedown listener does not hi-jack the show
    event.stopPropagation();
    if (!this._root) {
      return;
    }
    this._rootClientRect = this._root.getBoundingClientRect();
    if (!this._windowListenersAttached) {
      window.addEventListener('mousemove', this._handleWindowMouseMove);
      window.addEventListener('mouseup', this._handleWindowMouseUp);
      this._windowListenersAttached = true;
    }
    this._currentDragType = type;
    const update = this._getUpdate(clientX, type);
    this.props.updateNextViewRangeTime(update);
  }

  _handleRootMouseMove = function _handleRootMouseMove({ clientX }: SyntheticMouseEvent<any>) {
    if (this._rootClientRect) {
      this.setState({ cursorX: clientX - this._rootClientRect.left });
    }
  };

  _handleRootMouseLeave = function _handleRootMouseLeave() {
    this.setState({ cursorX: undefined });
  };

  _handleRootMouseDown = function _handleRootMouseDown({ button, clientX }: SyntheticMouseEvent<any>) {
    if (!this._root || button !== LEFT_MOUSE_BUTTON) {
      return;
    }
    if (!this._windowListenersAttached) {
      window.addEventListener('mousemove', this._handleWindowMouseMove);
      window.addEventListener('mouseup', this._handleWindowMouseUp);
      this._windowListenersAttached = true;
    }
    // the ClientRect retrieved when the SVG is initially rendered has an
    // inaccurate width, so refresh the ClientRect on mouse down
    this._rootClientRect = this._root.getBoundingClientRect();
    this._currentDragType = dragTypes.REFRAME;
    const update = this._getUpdate(clientX, dragTypes.REFRAME);
    this.props.updateNextViewRangeTime(update);
  };

  _handleWindowMouseMove = function _handleWindowMouseMove({ clientX }: SyntheticMouseEvent<any>) {
    if (!this._root || !this._currentDragType) {
      return;
    }
    const update = this._getUpdate(clientX, this._currentDragType);
    this.props.updateNextViewRangeTime(update);
  };

  _handleWindowMouseUp = function _handleWindowMouseUp({ clientX }: SyntheticMouseEvent<any>) {
    window.removeEventListener('mousemove', this._handleWindowMouseMove);
    window.removeEventListener('mouseup', this._handleWindowMouseUp);
    this._windowListenersAttached = false;
    if (!this._root || !this._currentDragType) {
      return;
    }
    const type = this._currentDragType;
    this._currentDragType = undefined;
    // reset cursorX to prevent a remnant cursorX from missing the mouseleave
    // event
    this.setState({ cursorX: undefined, preventCursorLine: false });

    const update = this._getUpdate(clientX, type);
    if (type === dragTypes.REFRAME) {
      const { reframe: { anchor, shift } } = update;
      const [start, end] = anchor < shift ? [anchor, shift] : [shift, anchor];
      this.props.updateViewRange(start, end);
      return;
    }
    const [viewStart, viewEnd] = this.props.viewRange.time.current;
    if (type === dragTypes.SHIFT_START) {
      this.props.updateViewRange(update.shiftStart, viewEnd);
      return;
    }
    this.props.updateViewRange(viewStart, update.shiftEnd);
  };

  getMarkers(from: number, to: number, isShift: boolean) {
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
      <div
        aria-hidden
        className="ViewingLayer"
        onMouseDown={this._handleRootMouseDown}
        onMouseLeave={this._handleRootMouseLeave}
        onMouseMove={this._handleRootMouseMove}
        ref={this._setRoot}
        style={{ height }}
      >
        <svg
          height={height}
          style={{ shapeRendering: 'crispEdges' }}
          className="ViewingLayer--graph"
          ref={this._setRoot}
          onMouseMove={this._handleRootMouseMove}
          onMouseLeave={this._handleRootMouseLeave}
          onMouseDown={this._handleRootMouseDown}
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
          {shiftStart != null && this.getMarkers(viewStart, shiftStart, true)}
          {shiftEnd != null && this.getMarkers(viewEnd, shiftEnd, true)}
          <Scrubber
            isDragging={shiftStart != null}
            onMouseDown={this._handleLeftScrubberMouseDown}
            onMouseEnter={this._handleScrubberMouseEnter}
            onMouseLeave={this._handleScrubberMouseLeave}
            position={viewStart || 0}
          />
          <Scrubber
            isDragging={shiftEnd != null}
            position={viewEnd || 1}
            onMouseDown={this._handleRightScrubberMouseDown}
            onMouseEnter={this._handleScrubberMouseEnter}
            onMouseLeave={this._handleScrubberMouseLeave}
          />
          {reframe != null && this.getMarkers(reframe.anchor, reframe.shift, false)}
        </svg>
        {haveNextTimeRange && <div className="ViewingLayer--fullOverlay" />}
      </div>
    );
  }
}
