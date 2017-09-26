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

import MouseDraggedState from './MouseDraggedState';
import GraphTicks from './GraphTicks';
import Scrubber from './Scrubber';

import './ViewingLayer.css';

type ViewingLayerProps = {
  height: number,
  numTicks: number,
  updateViewRange: ([number, number]) => void,
  viewRange: [number, number],
};

type ViewingLayerState = {
  cursorX: ?number,
  draggedState: ?MouseDraggedState,
  preventCursorLine: boolean,
};

const LEFT_MOUSE_BUTTON = 0;

const dragTags = {
  RESET: 'RESET',
  SCRUB_INTERMEDIATE_STATE: 'SCRUBBER_INTERMEDIATE_STATE',
  SCRUB_LEFT_HANDLE: 'SCRUB_LEFT_HANDLE',
  SCRUB_RIGHT_HANDLE: 'SCRUB_RIGHT_HANDLE',
};

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
      draggedState: undefined,
      preventCursorLine: false,
    };
    this._root = undefined;
    this._rootClientRect = undefined;
    this._windowListenersAttached = false;

    this._setRoot = this._setRoot.bind(this);
    this._handleScrubberMouseEnter = this._handleScrubberMouseEnter.bind(this);
    this._handleScrubberMouseLeave = this._handleScrubberMouseLeave.bind(this);
    this._handleLeftScrubberMouseDown = (event: SyntheticMouseEvent<any>) => {
      this._handleScrubberMouseDown(dragTags.SCRUB_LEFT_HANDLE, event);
    };
    this._handleRightScrubberMouseDown = (event: SyntheticMouseEvent<any>) => {
      this._handleScrubberMouseDown(dragTags.SCRUB_RIGHT_HANDLE, event);
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

  _handleScrubberMouseEnter = function _handleScrubberMouseEnter() {
    this.setState({ ...this.state, preventCursorLine: true });
  };

  _handleScrubberMouseLeave = function _handleScrubberMouseLeave() {
    this.setState({ ...this.state, preventCursorLine: false });
  };

  _handleScrubberMouseDown(tag: string, event: SyntheticMouseEvent<any>) {
    const { button, clientX } = event;
    if (button !== LEFT_MOUSE_BUTTON) {
      return;
    }
    // stop propagation so the root mousedown listener does not hi-jack the show
    event.stopPropagation();
    if (!this._root) {
      return;
    }
    // the ClientRect retrieved when the SVG is initially rendered has an
    // inaccurate width, so refresh the ClientRect on mouse down
    this._rootClientRect = this._root.getBoundingClientRect();
    window.addEventListener('mousemove', this._handleWindowMouseMove);
    window.addEventListener('mouseup', this._handleWindowMouseUp);
    this._windowListenersAttached = true;
    const [leftViewPosition, rightViewPosition] = this.props.viewRange;
    const opts: Object = {
      clientX,
      tag,
      clientRect: this._rootClientRect,
    };
    if (tag === dragTags.SCRUB_LEFT_HANDLE) {
      opts.start = leftViewPosition;
      opts.min = 0;
      opts.max = rightViewPosition;
    } else {
      opts.start = rightViewPosition;
      opts.min = leftViewPosition;
      opts.max = 1;
    }
    const draggedState = MouseDraggedState.newFromOptions(opts);
    this.setState({ ...this.state, draggedState });
  }

  _handleRootMouseMove = function _handleRootMouseMove({ clientX }: SyntheticMouseEvent<any>) {
    if (this._rootClientRect) {
      this.setState({ ...this.state, cursorX: clientX - this._rootClientRect.left });
    }
  };

  _handleRootMouseLeave = function _handleRootMouseLeave() {
    this.setState({ ...this.state, cursorX: undefined });
  };

  _handleRootMouseDown = function _handleRootMouseDown({ button, clientX }: SyntheticMouseEvent<any>) {
    if (!this._root || button !== LEFT_MOUSE_BUTTON) {
      return;
    }
    // the ClientRect retrieved when the SVG is initially rendered has an
    // inaccurate width, so refresh the ClientRect on mouse down
    this._rootClientRect = this._root.getBoundingClientRect();
    window.addEventListener('mousemove', this._handleWindowMouseMove);
    window.addEventListener('mouseup', this._handleWindowMouseUp);
    this._windowListenersAttached = true;
    const draggedState = MouseDraggedState.newFromOptions({
      clientX,
      clientRect: this._rootClientRect,
      max: 1,
      min: 0,
      tag: dragTags.RESET,
    });
    this.setState({ ...this.state, draggedState });
  };

  _handleWindowMouseMove = function _handleWindowMouseMove({ clientX }: SyntheticMouseEvent<any>) {
    if (this.state.draggedState) {
      const draggedState = this.state.draggedState.newPositionFromClientX(clientX);
      this.setState({ ...this.state, draggedState });
    }
  };

  _handleWindowMouseUp = function _handleWindowMouseUp({ clientX }: SyntheticMouseEvent<any>) {
    window.removeEventListener('mousemove', this._handleWindowMouseMove);
    window.removeEventListener('mouseup', this._handleWindowMouseUp);
    this._windowListenersAttached = false;
    if (this.state.draggedState) {
      const draggedState = this.state.draggedState.newPositionFromClientX(clientX);
      const { start: draggedFrom, position: draggedTo } = draggedState;
      let viewStart;
      let viewEnd;
      if (draggedState.tag === dragTags.RESET) {
        if (draggedFrom < draggedTo) {
          viewStart = draggedFrom;
          viewEnd = draggedTo;
        } else {
          viewStart = draggedTo;
          viewEnd = draggedFrom;
        }
      } else if (draggedState.tag === dragTags.SCRUB_LEFT_HANDLE) {
        const [, currentViewEnd] = this.props.viewRange;
        viewStart = draggedTo;
        viewEnd = currentViewEnd;
      } else {
        const [currentViewStart] = this.props.viewRange;
        viewStart = currentViewStart;
        viewEnd = draggedTo;
      }
      this.props.updateViewRange(viewStart, viewEnd);
      // reset cursorX to prevent a remnant cursorX from missing the mouseleave
      // event
      this.setState({ ...this.state, cursorX: undefined, draggedState: undefined, preventCursorLine: false });
    }
  };

  render() {
    const { height, viewRange, numTicks } = this.props;
    const { cursorX, draggedState, preventCursorLine } = this.state;
    const [leftBound, rightBound] = viewRange;
    let leftInactive = 0;
    if (leftBound) {
      leftInactive = leftBound * 100;
    }
    let rightInactive = 100;
    if (rightBound) {
      rightInactive = 100 - rightBound * 100;
    }
    let isScrubberDrag = false;
    const dragTag = draggedState && draggedState.tag;
    let dragMarkers: ?(React.Node[]);
    let fullOverlay: ?React.Node;
    let cursorGuide: ?React.Node;
    if (draggedState && dragTag) {
      isScrubberDrag = dragTag !== dragTags.RESET;
      const cls = cx({
        isScrubberDrag,
        isResetDrag: !isScrubberDrag,
      });
      const layout = draggedState.getLayout();
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
          {isScrubberDrag && dragMarkers}
          <Scrubber
            isDragging={dragTag === dragTags.SCRUB_LEFT_HANDLE}
            onMouseDown={this._handleLeftScrubberMouseDown}
            onMouseEnter={this._handleScrubberMouseEnter}
            onMouseLeave={this._handleScrubberMouseLeave}
            position={leftBound || 0}
          />
          <Scrubber
            isDragging={dragTag === dragTags.SCRUB_RIGHT_HANDLE}
            position={rightBound || 1}
            onMouseDown={this._handleRightScrubberMouseDown}
            onMouseEnter={this._handleScrubberMouseEnter}
            onMouseLeave={this._handleScrubberMouseLeave}
          />
          {!isScrubberDrag && dragMarkers}
        </svg>
        {fullOverlay}
      </div>
    );
  }
}
