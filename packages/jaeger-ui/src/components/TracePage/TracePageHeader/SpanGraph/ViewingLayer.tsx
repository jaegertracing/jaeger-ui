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
  isPanning: boolean;
  isCreatingAnchors: boolean;
  panStartX: number;
  panStartViewStart: number;
  panStartViewEnd: number;
  anchorStartX: number;
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
    isPanning: false,
    isCreatingAnchors: false,
    panStartX: 0,
    panStartViewStart: 0,
    panStartViewEnd: 0,
    anchorStartX: 0,
  };

  _root: Element | TNil;
  _draggerReframe: DraggableManager;
  _draggerStart: DraggableManager;
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
  }

  componentWillUnmount() {
    this._draggerReframe.dispose();
    this._draggerEnd.dispose();
    this._draggerStart.dispose();
  }

  _setRoot = (elm: SVGElement | TNil) => {
    this._root = elm;
  };

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

  _handleMouseDown = (event: React.MouseEvent<SVGElement>) => {
    const { left, width, height } = event.currentTarget.getBoundingClientRect();
    const clickXPosition = (event.clientX - left) / width;
    const clickYPosition = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const [viewStart, viewEnd] = this.props.viewRange.time.current;

    const isFullView = viewStart === 0 && viewEnd === 1;
    const isInTopArea = clickYPosition < height * 0.4;

    if (isFullView || !isInTopArea) {
      // Start creating new anchors if there are no anchors or if click is in the bottom 60%
      this.setState({
        isCreatingAnchors: true,
        anchorStartX: clickXPosition,
      });
      document.addEventListener('mousemove', this._handleAnchorMove);
      document.addEventListener('mouseup', this._handleAnchorUp);
    } else {
      // Start panning if there are anchors and click is in the top 40%
      this.setState({
        isPanning: true,
        panStartX: event.clientX,
        panStartViewStart: viewStart,
        panStartViewEnd: viewEnd,
      });
      document.addEventListener('mousemove', this._handlePanMove);
      document.addEventListener('mouseup', this._handlePanUp);
    }
  };

  _handlePanMove = (event: MouseEvent) => {
    if (!this.state.isPanning) return;

    const { panStartX, panStartViewStart, panStartViewEnd } = this.state;
    const { left, width } = this._root.getBoundingClientRect();
    const deltaX = (event.clientX - panStartX) / width;
    const viewWindow = panStartViewEnd - panStartViewStart;

    let newViewStart = panStartViewStart + deltaX;
    let newViewEnd = panStartViewEnd + deltaX;

    if (newViewStart < 0) {
      newViewStart = 0;
      newViewEnd = viewWindow;
    } else if (newViewEnd > 1) {
      newViewEnd = 1;
      newViewStart = 1 - viewWindow;
    }

    this.props.updateViewRangeTime(newViewStart, newViewEnd, 'drag');
  };

  _handlePanUp = () => {
    this.setState({ isPanning: false });
    document.removeEventListener('mousemove', this._handlePanMove);
    document.removeEventListener('mouseup', this._handlePanUp);
  };

  _handleAnchorMove = (event: MouseEvent) => {
    if (!this.state.isCreatingAnchors) return;

    const { anchorStartX } = this.state;
    const { left, width } = this._root.getBoundingClientRect();
    const currentX = (event.clientX - left) / width;

    let newViewStart = Math.min(anchorStartX, currentX);
    let newViewEnd = Math.max(anchorStartX, currentX);

    // Ensure the new view range is within bounds
    if (newViewStart < 0) newViewStart = 0;
    if (newViewEnd > 1) newViewEnd = 1;

    this.props.updateNextViewRangeTime({ reframe: { anchor: anchorStartX, shift: currentX } });
  };

  _handleAnchorUp = () => {
    this.setState({ isCreatingAnchors: false });
    document.removeEventListener('mousemove', this._handleAnchorMove);
    document.removeEventListener('mouseup', this._handleAnchorUp);

    const { reframe } = this.props.viewRange.time;
    if (reframe) {
      const [start, end] = reframe.anchor < reframe.shift
        ? [reframe.anchor, reframe.shift]
        : [reframe.shift, reframe.anchor];
      this.props.updateViewRangeTime(start, end, 'mouseup');
    }
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
    this.props.updateViewRangeTime(start, end, 'minimap');
  };

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

  _resetTimeZoomClickHandler = () => {
    this.props.updateViewRangeTime(0, 1);
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

  _getInactiveRects(viewStart: number, viewEnd: number) {
    const rects = [];
    if (viewStart > 0) {
      rects.push(
        <rect
          key="left"
          className="ViewingLayer--inactive"
          x="0"
          y="0"
          width={`${viewStart * 100}%`}
          height={this.props.height - 2}
        />
      );
    }
    if (viewEnd < 1) {
      rects.push(
        <rect
          key="right"
          className="ViewingLayer--inactive"
          x={`${viewEnd * 100}%`}
          y="0"
          width={`${(1 - viewEnd) * 100}%`}
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

    const cursorPosition = (!haveNextTimeRange && cursor != null && !preventCursorLine)
      ? `${cursor * 100}%`
      : undefined;

    const isFullView = viewStart === 0 && viewEnd === 1;
    const scrubberHeight = isFullView ? 0 : height * 0.4; // Top 40% for scrubbing when anchors exist
    const anchorHeight = isFullView ? height : height * 0.6; // Full height for anchor creation when no anchors, otherwise bottom 60%

    return (
      <div aria-hidden className="ViewingLayer" style={{ height }}>
        <Button
          onClick={this._resetTimeZoomClickHandler}
          className="ViewingLayer--resetZoom"
          htmlType="button"
        >
          Reset Selection
        </Button>
        <svg
          height={height}
          className="ViewingLayer--graph"
          ref={this._setRoot}
          onMouseDown={this._handleMouseDown}
        >
          {!isFullView && (
            <rect
              x="0"
              y="0"
              width="100%"
              height={scrubberHeight}
              className="ViewingLayer--scrubber"
              fill="transparent"
            />
          )}
          <rect
            x="0"
            y={isFullView ? 0 : scrubberHeight}
            width="100%"
            height={anchorHeight}
            className="ViewingLayer--anchor"
            fill="transparent"
          />
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
      </div>
    );
  }
}