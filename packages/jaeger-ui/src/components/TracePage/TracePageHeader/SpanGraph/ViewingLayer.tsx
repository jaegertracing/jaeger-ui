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
import _ from 'lodash';

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

type ViewingLayerProps = {
  height: number;
  numTicks: number;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  viewRange: IViewRange;
};

type ViewingLayerState = {
  preventCursorLine: boolean;
  isPanning: boolean;
  isCreatingAnchors: boolean;
  interactionLocked: boolean;
  panStartX: number;
  panStartViewStart: number;
  panStartViewEnd: number;
  anchorStartX: number;
  hoverPosition: number | null;
  isScrubbing: boolean;
};

export const dragTypes = {
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
  _root: Element | TNil;
  _draggerReframe: DraggableManager;
  _draggerStart: DraggableManager;
  _draggerEnd: DraggableManager;
  _debouncedMouseMove: _.DebouncedFunc<(event: React.MouseEvent<HTMLElement>) => void>;

  constructor(props: ViewingLayerProps) {
    super(props);

    this.state = {
      preventCursorLine: false,
      isPanning: false,
      isCreatingAnchors: false,
      interactionLocked: false,
      panStartX: 0,
      panStartViewStart: 0,
      panStartViewEnd: 0,
      anchorStartX: 0,
      hoverPosition: null,
      isScrubbing: false,
    };

    this._draggerReframe = new DraggableManager({
      getBounds: this._getDraggingBounds,
      onDragEnd: this._handleReframeDragEnd,
      onDragMove: this._handleReframeDragUpdate,
      onDragStart: this._handleReframeDragUpdate,
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
    this._debouncedMouseMove = _.debounce(this._handleMouseMoveImpl, 50);
  }

  componentDidMount() {
    window.addEventListener('mousemove', this._handleWindowMouseMove);
    window.addEventListener('mouseup', this._handleWindowMouseUp);
  }

  componentWillUnmount() {
    this._draggerReframe.dispose();
    this._draggerEnd.dispose();
    this._draggerStart.dispose();
    window.removeEventListener('mousemove', this._handleWindowMouseMove);
    window.removeEventListener('mouseup', this._handleWindowMouseUp);
    this._debouncedMouseMove.cancel();
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
        interactionLocked: true,
        anchorStartX: clickXPosition,
        isScrubbing: false,
      });
    } else {
      // Start panning if there are anchors and click is in the top 40%
      this.setState({
        isPanning: true,
        interactionLocked: true,
        panStartX: event.clientX,
        panStartViewStart: viewStart,
        panStartViewEnd: viewEnd,
        isScrubbing: true,
      });
    }
    document.documentElement.classList.add('is-dragging');
  };

  _handleWindowMouseMove = (event: MouseEvent) => {
    if (this.state.isPanning) {
      this._handlePanMove(event);
    } else if (this.state.isCreatingAnchors) {
      this._handleAnchorMove(event);
    }
  };

  _handleWindowMouseUp = () => {
    if (this.state.isPanning) {
      this._handlePanUp();
    }
    if (this.state.isCreatingAnchors) {
      this._handleAnchorUp();
    }
    this.setState({
      isPanning: false,
      isCreatingAnchors: false,
      interactionLocked: false,
    });
    document.documentElement.classList.remove('is-dragging');
  };

  _handlePanMove = (event: MouseEvent) => {
    if (!this.state.isPanning || !this.state.interactionLocked) return;

    const { panStartX, panStartViewStart, panStartViewEnd } = this.state;
    const { width } = this._root ? this._root.getBoundingClientRect() : { width: 0 };
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
    this.setState({ isPanning: false, interactionLocked: false, isScrubbing: false });
  };

  _handleAnchorMove = (event: MouseEvent) => {
    if (!this.state.isCreatingAnchors || !this.state.interactionLocked) return;

    const { anchorStartX } = this.state;
    const { left, width } = this._root ? this._root.getBoundingClientRect() : { left: 0, width: 0 };
    const currentX = (event.clientX - left) / width;

    let newViewStart = Math.min(anchorStartX, currentX);
    let newViewEnd = Math.max(anchorStartX, currentX);

    // Ensure the new view range is within bounds
    newViewStart = Math.max(0, newViewStart);
    newViewEnd = Math.min(1, newViewEnd);

    this.props.updateNextViewRangeTime({ reframe: { anchor: anchorStartX, shift: currentX } });
  };

  _handleAnchorUp = () => {
    this.setState({ isCreatingAnchors: false, interactionLocked: false });

    const { reframe } = this.props.viewRange.time;
    if (reframe) {
      const [start, end] =
        reframe.anchor < reframe.shift ? [reframe.anchor, reframe.shift] : [reframe.shift, reframe.anchor];
      this.props.updateViewRangeTime(start, end, 'mouseup');
    }
  };

  _handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (this.state.isScrubbing) {
      return;
    }

    const targetElement = event.currentTarget as HTMLElement;
    const { left, width } = targetElement.getBoundingClientRect();
    const cursorPosition = (event.clientX - left) / width;

    if (this.state.isCreatingAnchors) {
      const { anchorStartX } = this.state;
      this.props.updateNextViewRangeTime({ reframe: { anchor: anchorStartX, shift: cursorPosition } });
    } else {
      this.setState({ hoverPosition: cursorPosition });
      this._debouncedMouseMove(event);
    }
  };

  _handleMouseMoveImpl = (event: React.MouseEvent<HTMLElement>) => {
    const targetElement = event.currentTarget as HTMLElement;
    const { left, width } = targetElement.getBoundingClientRect();
    const hoverPosition = (event.clientX - left) / width;
    this.props.updateNextViewRangeTime({ cursor: hoverPosition });
  };

  _handleMouseLeave = () => {
    if (!this.state.isScrubbing) {
      this.setState({ hoverPosition: null });
      this.props.updateNextViewRangeTime({ cursor: null });
    }
  };

  _handleReframeDragUpdate = ({ value }: DraggingUpdate) => {
    const shift = Math.min(1, Math.max(0, value));
    const { time } = this.props.viewRange;
    const anchor = time.reframe ? Math.min(1, Math.max(0, time.reframe.anchor)) : shift;
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
      this.setState({ isScrubbing: true });
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
    this.setState({ preventCursorLine: false, isScrubbing: false });
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
    const { height } = this.props;
    const rects = [];
    if (viewStart > 0) {
      rects.push(
        <rect
          key="left"
          className="ViewingLayer--inactive"
          x={0}
          y={0}
          width={`${viewStart * 100}%`}
          height={height}
        />
      );
    }
    if (viewEnd < 1) {
      rects.push(
        <rect
          key="right"
          className="ViewingLayer--inactive"
          x={`${viewEnd * 100}%`}
          y={0}
          width={`${(1 - viewEnd) * 100}%`}
          height={height}
        />
      );
    }
    return rects;
  }

  render() {
    const { height, viewRange, numTicks } = this.props;
    const { preventCursorLine, hoverPosition } = this.state;
    const { current, cursor, shiftStart, shiftEnd, reframe } = viewRange.time;
    const [viewStart, viewEnd] = current;
    const haveNextTimeRange = shiftStart != null || shiftEnd != null || reframe != null;

    const isFullView = Math.abs(viewStart) < 0.001 && Math.abs(viewEnd - 1) < 0.001;
    const scrubberHeight = isFullView ? 0 : Math.floor(height * 0.4);
    const anchorHeight = isFullView ? height : height - scrubberHeight;

    const viewingLayerClasses = cx('ViewingLayer', {
      'is-panning': this.state.isPanning,
      'is-creating-anchors': this.state.isCreatingAnchors,
      'has-anchors': !isFullView,
      'is-scrubbing': this.state.isScrubbing,
    });

    let cursorPosition: string | undefined;
    if (!haveNextTimeRange && cursor != null && !preventCursorLine) {
      cursorPosition = `${cursor * 100}%`;
    }

    return (
      <div
        aria-hidden
        className={viewingLayerClasses}
        style={{ height }}
        onMouseMove={this._handleMouseMove}
        onMouseLeave={this._handleMouseLeave}
      >
        {!isFullView && (
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
            y={scrubberHeight}
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
              y2={height}
              strokeWidth="1"
            />
          )}
          {hoverPosition !== null && !this.state.isScrubbing && !haveNextTimeRange && (
            <line
              className="ViewingLayer--hoverLine"
              x1={`${hoverPosition * 100}%`}
              y1="0"
              x2={`${hoverPosition * 100}%`}
              y2={height}
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
