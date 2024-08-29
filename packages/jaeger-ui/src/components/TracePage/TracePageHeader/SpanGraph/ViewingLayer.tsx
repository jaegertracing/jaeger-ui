// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Button } from 'antd';
import cx from 'classnames';
import * as React from 'react';

import GraphTicks from './GraphTicks';
import Scrubber from './Scrubber';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate } from '../../types';
import { TNil } from '../../../../types';
import DraggableManager, {
  DraggableBounds,
  DraggingUpdate,
  EUpdateTypes,
} from '../../../../utils/DraggableManager';

import './ViewingLayer.css';

// Define prop types for the ViewingLayer component
type ViewingLayerProps = {
  height: number;
  numTicks: number;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  viewRange: IViewRange;
};

// Define state types for the ViewingLayer component
type ViewingLayerState = {
  preventCursorLine: boolean;
};

// Define drag types for different interactions
export const dragTypes = {
  SHIFT_END: 'SHIFT_END',
  SHIFT_START: 'SHIFT_START',
  REFRAME: 'REFRAME',
};

// Helper function to calculate the next view layout based on start and position
function getNextViewLayout(start: number, position: number) {
  const [left, right] = start < position ? [start, position] : [position, start];
  return {
    x: `${left * 100}%`,
    width: `${(right - left) * 100}%`,
    leadingX: `${position * 100}%`,
  };
}

// Main ViewingLayer component
export default class ViewingLayer extends React.PureComponent<ViewingLayerProps, ViewingLayerState> {
  state: ViewingLayerState = {
    preventCursorLine: false,
  };

  // Refs and instance variables
  _root: Element | TNil;
  _scrollBar: HTMLDivElement | TNil;
  _scrollThumb: HTMLDivElement | TNil;
  _draggerReframe: DraggableManager;
  _draggerStart: DraggableManager;
  _draggerEnd: DraggableManager;
  _isDraggingThumb: boolean = false;
  _startX: number = 0;
  _startLeft: number = 0;

  constructor(props: ViewingLayerProps) {
    super(props);

    // Initialize draggable managers for different interactions
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
    this._scrollBar = undefined;
    this._scrollThumb = undefined;
  }

  // Lifecycle methods
  componentDidMount() {
    this._updateScrollThumb();
    this._addScrollThumbListeners();
  }

  componentDidUpdate(prevProps: ViewingLayerProps) {
    if (prevProps.viewRange !== this.props.viewRange) {
      this._updateScrollThumb();
    }
  }

  componentWillUnmount() {
    this._draggerReframe.dispose();
    this._draggerEnd.dispose();
    this._draggerStart.dispose();
    this._removeScrollThumbListeners();
  }

  // Ref setters
  _setRoot = (elm: SVGElement | TNil) => {
    this._root = elm;
  };

  _setScrollBar = (elm: HTMLDivElement | TNil) => {
    this._scrollBar = elm;
  };

  _setScrollThumb = (elm: HTMLDivElement | TNil) => {
    this._scrollThumb = elm;
  };

  // Scroll thumb event listeners
  _addScrollThumbListeners() {
    if (this._scrollThumb) {
      this._scrollThumb.addEventListener('mousedown', this._onThumbMouseDown);
    }
  }

  _removeScrollThumbListeners() {
    if (this._scrollThumb) {
      this._scrollThumb.removeEventListener('mousedown', this._onThumbMouseDown);
    }
    document.removeEventListener('mousemove', this._onThumbMouseMove);
    document.removeEventListener('mouseup', this._onThumbMouseUp);
  }

  // Scroll thumb drag handlers
  _onThumbMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    this._isDraggingThumb = true;
    this._startX = e.clientX;
    this._startLeft = this._scrollThumb ? this._scrollThumb.offsetLeft : 0;

    document.addEventListener('mousemove', this._onThumbMouseMove);
    document.addEventListener('mouseup', this._onThumbMouseUp);
  };

  _onThumbMouseMove = (e: MouseEvent) => {
    if (!this._isDraggingThumb || !this._scrollThumb || !this._scrollBar) return;

    const deltaX = e.clientX - this._startX;
    const newLeft = Math.min(
      Math.max(0, this._startLeft + deltaX),
      this._scrollBar.clientWidth - this._scrollThumb.clientWidth
    );

    const viewStart = newLeft / this._scrollBar.clientWidth;
    const viewEnd = viewStart + this._scrollThumb.clientWidth / this._scrollBar.clientWidth;

    this._scrollThumb.style.left = `${newLeft}px`;

    this.props.updateViewRangeTime(viewStart, viewEnd, 'scroll');
  };

  _onThumbMouseUp = () => {
    this._isDraggingThumb = false;
    document.removeEventListener('mousemove', this._onThumbMouseMove);
    document.removeEventListener('mouseup', this._onThumbMouseUp);
  };

  // Update scroll thumb position and size
  _updateScrollThumb = () => {
    if (this._scrollBar && this._scrollThumb) {
      const { current } = this.props.viewRange.time;
      const [viewStart, viewEnd] = current;
      const viewWidth = viewEnd - viewStart;

      this._scrollThumb.style.left = `${viewStart * this._scrollBar.clientWidth}px`;
      this._scrollThumb.style.width = `${viewWidth * this._scrollBar.clientWidth}px`;
    }
  };

  // Get dragging bounds for DraggableManager
  _getDraggingBounds = (tag: string | TNil): DraggableBounds => {
    if (!this._root) {
      throw new Error('Invalid state: root element is null');
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

  // Reframe drag handlers
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
    this.props.updateViewRangeTime(start, end, 'minimap');
  };

  // Scrubber drag handlers
  _handleScrubberEnterLeave = ({ type }: DraggingUpdate) => {
    const preventCursorLine = type === EUpdateTypes.MouseEnter;
    this.setState({ preventCursorLine });
  };

  _handleScrubberDragUpdate = ({ event, tag, type, value }: DraggingUpdate) => {
    if (type === EUpdateTypes.DragStart) {
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
      throw new Error('Unexpected tag');
    }
    manager.resetBounds();
    this.setState({ preventCursorLine: false });
    this.props.updateViewRangeTime(update[0], update[1], 'minimap');
  };

  // Scroll handler for the scroll bar
  _handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!this._scrollBar) return;
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    const viewStart = scrollLeft / scrollWidth;
    const viewEnd = (scrollLeft + clientWidth) / scrollWidth;

    this.props.updateViewRangeTime(viewStart, viewEnd, 'scroll');
  };

  // Reset time zoom handler
  _resetTimeZoomClickHandler = () => {
    this.props.updateViewRangeTime(0, 1);
  };

  // Generate markers for drag operations
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

  _getInactiveRects(viewStart: number, viewEnd: number) {
    const rects = [];
    if (viewStart > 0) {
      rects.push(
        <rect
          key="left"
          className="ViewingLayer--inactive"
          x="0"
          y="0"
          width={`${(viewStart * 100).toFixed(6)}%`}
          height={this.props.height - 2}
        />
      );
    }
    if (viewEnd < 1) {
      rects.push(
        <rect
          key="right"
          className="ViewingLayer--inactive"
          x={`${(viewEnd * 100).toFixed(6)}%`}
          y="0"
          width={`${((1 - viewEnd) * 100).toFixed(6)}%`}
          height={this.props.height - 2}
        />
      );
    }
    return rects;
  }

  render() {
    const { height, viewRange, numTicks } = this.props;
    const { preventCursorLine } = this.state;
    const { current, cursor, shiftStart, shiftEnd, reframe } = viewRange.time;
    const [viewStart, viewEnd] = current;
    const haveNextTimeRange = shiftStart != null || shiftEnd != null || reframe != null;

    const showScrollBar = viewStart > 0 || viewEnd < 1;
    const containerHeight = showScrollBar ? height + 20 : height;

    let cursorPosition: string | undefined;
    if (!haveNextTimeRange && cursor != null && !preventCursorLine) {
      cursorPosition = `${cursor * 100}%`;
    }

    return (
      <div aria-hidden className="ViewingLayer" style={{ height: containerHeight }}>
        {showScrollBar && (
          <Button
            onClick={this._resetTimeZoomClickHandler}
            className="ViewingLayer--resetZoom"
            htmlType="button"
          >
            Reset Selection
          </Button>
        )}
        <svg
          height={height}
          className="ViewingLayer--graph"
          ref={this._setRoot}
          onMouseDown={this._draggerReframe.handleMouseDown}
          onMouseLeave={this._draggerReframe.handleMouseLeave}
          onMouseMove={this._draggerReframe.handleMouseMove}
        >
          {this._getInactiveRects(viewStart, viewEnd)}
          <GraphTicks numTicks={numTicks} />
          {cursorPosition && (
            <line
              className="ViewingLayer--cursorGuide"
              x1={cursorPosition}
              y1="0"
              x2={cursorPosition}
              y2={height - 2}
              strokeWidth="1"
            />
          )}
          {shiftStart != null && this._getMarkers(viewStart, shiftStart, true)}
          {shiftEnd != null && this._getMarkers(viewEnd, shiftEnd, true)}
          <Scrubber
            isDragging={shiftStart != null}
            onMouseDown={this._draggerStart.handleMouseDown}
            onMouseEnter={this._draggerStart.handleMouseEnter}
            onMouseLeave={this._draggerStart.handleMouseLeave}
            position={viewStart}
          />
          <Scrubber
            isDragging={shiftEnd != null}
            position={viewEnd}
            onMouseDown={this._draggerEnd.handleMouseDown}
            onMouseEnter={this._draggerEnd.handleMouseEnter}
            onMouseLeave={this._draggerEnd.handleMouseLeave}
          />
          {reframe != null && this._getMarkers(reframe.anchor, reframe.shift, false)}
        </svg>
        {haveNextTimeRange && <div className="ViewingLayer--fullOverlay" />}
        <div
          className="ViewingLayer--scrollBar"
          ref={this._setScrollBar}
          onScroll={this._handleScroll}
          style={{
            overflowX: 'auto',
            height: '20px',
            position: 'relative',
            visibility: showScrollBar ? 'visible' : 'hidden',
          }}
        >
          <div style={{ width: '100%', height: '1px' }} />
          <div
            className="ViewingLayer--scrollThumb"
            ref={this._setScrollThumb}
            style={{
              left: `${viewStart * 100}%`,
              width: `${(viewEnd - viewStart) * 100}%`,
            }}
          />
        </div>
      </div>
    );
  }
}
