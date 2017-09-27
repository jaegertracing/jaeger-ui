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
import { NextViewRangeTypes } from '../types';
import type { NextViewRangeType, ViewRange } from '../types';

import './ViewingLayer.css';

type ViewingLayerProps = {
  height: number,
  numTicks: number,
  updateViewRange: (number, number) => void,
  updateNextViewRange: (number, number, NextViewRangeType) => void,
  viewRange: ViewRange,
};

type ViewingLayerState = {
  cursorX: ?number,
  preventCursorLine: boolean,
};

const LEFT_MOUSE_BUTTON = 0;

function getNextViewLayout(start: number, position: number) {
  if (start < position) {
    return {
      x: `${start * 100}%`,
      width: `${(position - start) * 100}%`,
      leadingX: `${position * 100}%`,
    };
  }
  return {
    x: `${position * 100}%`,
    width: `${(start - position) * 100}%`,
    leadingX: `${position * 100}%`,
  };
}

export default class ViewingLayer extends React.PureComponent<ViewingLayerProps, ViewingLayerState> {
  props: ViewingLayerProps;
  state: ViewingLayerState;

  _root: ?Element;
  _rootClientRect: ?ClientRect;
  _windowListenersAttached: boolean;
  _handleLeftScrubberMouseDown: (SyntheticMouseEvent<any>) => void;
  _handleRightScrubberMouseDown: (SyntheticMouseEvent<any>) => void;

  constructor(props: ViewingLayerProps) {
    super(props);
    this.state = {
      cursorX: undefined,
      preventCursorLine: false,
    };
    this._root = undefined;
    this._rootClientRect = undefined;
    this._windowListenersAttached = false;

    this._setRoot = this._setRoot.bind(this);
    this._handleScrubberMouseEnter = this._handleScrubberMouseEnter.bind(this);
    this._handleScrubberMouseLeave = this._handleScrubberMouseLeave.bind(this);
    this._handleLeftScrubberMouseDown = (event: SyntheticMouseEvent<any>) => {
      this._handleScrubberMouseDown(NextViewRangeTypes.SHIFT_LEFT, event);
    };
    this._handleRightScrubberMouseDown = (event: SyntheticMouseEvent<any>) => {
      this._handleScrubberMouseDown(NextViewRangeTypes.SHIFT_RIGHT, event);
    };
    this._handleRootMouseMove = this._handleRootMouseMove.bind(this);
    this._handleRootMouseLeave = this._handleRootMouseLeave.bind(this);
    this._handleRootMouseDown = this._handleRootMouseDown.bind(this);
    this._handleWindowMouseMove = this._handleWindowMouseMove.bind(this);
    this._handleWindowMouseUp = this._handleWindowMouseUp.bind(this);
  }

  _setRoot = function _setRoot(elm: ?Element) {
    this._root = elm;
    if (elm) {
      this._rootClientRect = elm.getBoundingClientRect();
    } else {
      this._rootClientRect = undefined;
    }
  };

  _getPosition(clientX: number, type: NextViewRangeType) {
    if (!this._rootClientRect) {
      return NaN;
    }
    const position = (clientX - this._rootClientRect.left) / (this._rootClientRect.width || 1);
    if (type === NextViewRangeTypes.REFRAME) {
      return _clamp(position, 0, 1);
    }
    if (type === NextViewRangeTypes.SHIFT_LEFT) {
      const [, endView] = this.props.viewRange.current;
      return _clamp(position, 0, endView);
    }
    const [startView] = this.props.viewRange.current;
    return _clamp(position, startView, 1);
  }

  _handleScrubberMouseEnter = function _handleScrubberMouseEnter() {
    this.setState({ preventCursorLine: true });
  };

  _handleScrubberMouseLeave = function _handleScrubberMouseLeave() {
    this.setState({ preventCursorLine: false });
  };

  _handleScrubberMouseDown(type: NextViewRangeType, event: SyntheticMouseEvent<any>) {
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
    const position = this._getPosition(clientX, type);
    const [viewStart, viewEnd] = this.props.viewRange.current;
    const start = type === NextViewRangeTypes.SHIFT_LEFT ? viewStart : viewEnd;
    window.addEventListener('mousemove', this._handleWindowMouseMove);
    window.addEventListener('mouseup', this._handleWindowMouseUp);
    this._windowListenersAttached = true;
    this.props.updateNextViewRange(start, position, type);
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
    window.addEventListener('mousemove', this._handleWindowMouseMove);
    window.addEventListener('mouseup', this._handleWindowMouseUp);
    this._windowListenersAttached = true;
    // the ClientRect retrieved when the SVG is initially rendered has an
    // inaccurate width, so refresh the ClientRect on mouse down
    this._rootClientRect = this._root.getBoundingClientRect();
    const position = this._getPosition(clientX, NextViewRangeTypes.REFRAME);
    this.props.updateNextViewRange(position, position, NextViewRangeTypes.REFRAME);
  };

  _handleWindowMouseMove = function _handleWindowMouseMove({ clientX }: SyntheticMouseEvent<any>) {
    if (!this._root || !this.props.viewRange.next) {
      return;
    }
    const { start, type } = this.props.viewRange.next;
    const position = this._getPosition(clientX, type);
    this.props.updateNextViewRange(start, position, type);
  };

  _handleWindowMouseUp = function _handleWindowMouseUp({ clientX }: SyntheticMouseEvent<any>) {
    window.removeEventListener('mousemove', this._handleWindowMouseMove);
    window.removeEventListener('mouseup', this._handleWindowMouseUp);
    this._windowListenersAttached = false;
    if (!this._root || !this.props.viewRange.next) {
      return;
    }
    const { start, type } = this.props.viewRange.next;
    const position = this._getPosition(clientX, type);
    if (type === NextViewRangeTypes.REFRAME) {
      const [newStart, newEnd] = start < position ? [start, position] : [position, start];
      this.props.updateViewRange(newStart, newEnd);
      return;
    }
    if (type === NextViewRangeTypes.SHIFT_LEFT) {
      const [, viewEnd] = this.props.viewRange.current;
      this.props.updateViewRange(position, viewEnd);
      return;
    }
    const [viewStart] = this.props.viewRange.current;
    this.props.updateViewRange(viewStart, position);
  };

  render() {
    const { height, viewRange, numTicks } = this.props;
    const { cursorX, preventCursorLine } = this.state;
    const [viewStart, viewEnd] = viewRange.current;
    // const
    console.log('viewRange:', viewRange);
    let leftInactive = 0;
    if (viewStart) {
      leftInactive = viewStart * 100;
    }
    let rightInactive = 100;
    if (viewEnd) {
      rightInactive = 100 - viewEnd * 100;
    }
    let isShiftDrag = false;
    let dragMarkers: ?(React.Node[]);
    let fullOverlay: ?React.Node;
    let cursorGuide: ?React.Node;
    if (viewRange.next) {
      const { start, position, type } = viewRange.next;
      isShiftDrag = type !== NextViewRangeTypes.REFRAME;
      const cls = cx({
        isShiftDrag,
        isReframeDrag: !isShiftDrag,
      });
      const layout = getNextViewLayout(start, position);
      dragMarkers = [
        <rect
          key="fill"
          className={`ViewingLayer--draggedShift ${cls}`}
          x={layout.x}
          y="0"
          width={layout.width}
          height={height - 2}
        />,
        <rect
          key="edge"
          className={`ViewingLayer--draggedEdge ${cls}`}
          x={layout.leadingX}
          y="0"
          width="1"
          height={height - 2}
        />,
      ];
      fullOverlay = <div className="ViewingLayer--fullOverlay" />;
    } else if (cursorX != null && !preventCursorLine) {
      cursorGuide = (
        <line
          className="ViewingLayer--cursorGuide"
          x1={cursorX}
          y1="0"
          x2={cursorX}
          y2={height - 2}
          strokeWidth="1"
        />
      );
    }
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
          {cursorGuide}
          {isShiftDrag && dragMarkers}
          <Scrubber
            isDragging={!!viewRange.next && viewRange.next.type === NextViewRangeTypes.SHIFT_LEFT}
            onMouseDown={this._handleLeftScrubberMouseDown}
            onMouseEnter={this._handleScrubberMouseEnter}
            onMouseLeave={this._handleScrubberMouseLeave}
            position={viewStart || 0}
          />
          <Scrubber
            isDragging={!!viewRange.next && viewRange.next.type === NextViewRangeTypes.SHIFT_RIGHT}
            position={viewEnd || 1}
            onMouseDown={this._handleRightScrubberMouseDown}
            onMouseEnter={this._handleScrubberMouseEnter}
            onMouseLeave={this._handleScrubberMouseLeave}
          />
          {!isShiftDrag && dragMarkers}
        </svg>
        {fullOverlay}
      </div>
    );
  }
}
