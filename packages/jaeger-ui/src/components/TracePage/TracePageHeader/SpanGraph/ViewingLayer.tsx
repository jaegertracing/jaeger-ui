// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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

type ViewingLayerProps = {
  height: number;
  numTicks: number;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  viewRange: IViewRange;
};

/**
 * Designate the tags for the different dragging managers.
 */
const dragTypes = {
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
} as const;

type ScrubberDragType = typeof dragTypes.SHIFT_START | typeof dragTypes.SHIFT_END;

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
function ViewingLayer(props: ViewingLayerProps) {
  const { height, numTicks, viewRange } = props;
  /**
   * Cursor line should not be drawn when the mouse is over the scrubber handle.
   */
  const [preventCursorLine, setPreventCursorLine] = React.useState(false);
  const rootRef = React.useRef<SVGSVGElement>(null);
  const propsRef = React.useRef(props);
  React.useLayoutEffect(() => {
    propsRef.current = props;
  });

  const getDraggingBounds = React.useCallback((tag: string | TNil): DraggableBounds => {
    const root = rootRef.current;
    if (!root) {
      /* istanbul ignore next : unreachable */
      throw new Error('invalid state');
    }
    const { left: clientXLeft, width } = root.getBoundingClientRect();
    const [viewStart, viewEnd] = propsRef.current.viewRange.time.current;
    let maxValue = 1;
    let minValue = 0;
    if (tag === dragTypes.SHIFT_START) {
      maxValue = viewEnd;
    } else if (tag === dragTypes.SHIFT_END) {
      minValue = viewStart;
    }
    return { clientXLeft, maxValue, minValue, width };
  }, []);

  const handleReframeMouseMove = React.useCallback(({ value }: DraggingUpdate) => {
    propsRef.current.updateNextViewRangeTime({ cursor: value });
  }, []);

  const handleReframeMouseLeave = React.useCallback(() => {
    propsRef.current.updateNextViewRangeTime({ cursor: null });
  }, []);

  const handleReframeDragUpdate = React.useCallback(({ value }: DraggingUpdate) => {
    const { time } = propsRef.current.viewRange;
    const anchor = time.reframe ? time.reframe.anchor : value;
    propsRef.current.updateNextViewRangeTime({ reframe: { anchor, shift: value } });
  }, []);

  const handleReframeDragEnd = React.useCallback(({ manager, value }: DraggingUpdate) => {
    const { time } = propsRef.current.viewRange;
    const anchor = time.reframe ? time.reframe.anchor : value;
    const [start, end] = value < anchor ? [value, anchor] : [anchor, value];
    manager.resetBounds();
    propsRef.current.updateViewRangeTime(start, end, 'minimap');
  }, []);

  const handleScrubberEnterLeave = React.useCallback(({ type }: DraggingUpdate) => {
    setPreventCursorLine(type === EUpdateTypes.MouseEnter);
  }, []);

  const handleScrubberDragUpdate = React.useCallback(
    (tag: ScrubberDragType, { event, type, value }: DraggingUpdate) => {
      if (type === EUpdateTypes.DragStart) {
        event.stopPropagation();
      }
      const update = tag === dragTypes.SHIFT_START ? { shiftStart: value } : { shiftEnd: value };
      propsRef.current.updateNextViewRangeTime(update);
    },
    []
  );

  const handleScrubberDragEnd = React.useCallback(
    (tag: ScrubberDragType, { manager, value }: DraggingUpdate) => {
      const [viewStart, viewEnd] = propsRef.current.viewRange.time.current;
      const update: [number, number] = tag === dragTypes.SHIFT_START ? [value, viewEnd] : [viewStart, value];
      manager.resetBounds();
      setPreventCursorLine(false);
      propsRef.current.updateViewRangeTime(update[0], update[1], 'minimap');
    },
    []
  );

  /**
   * `draggerReframeRef` handles clicking and dragging on the `ViewingLayer` to
   * redefine the view range.
   */
  const draggerReframeRef = React.useRef<DraggableManager | null>(null);
  /**
   * `draggerStartRef` handles dragging the left scrubber to adjust the start of
   * the view range.
   */
  const draggerStartRef = React.useRef<DraggableManager | null>(null);
  /**
   * `draggerEndRef` handles dragging the right scrubber to adjust the end of
   * the view range.
   */
  const draggerEndRef = React.useRef<DraggableManager | null>(null);
  React.useLayoutEffect(() => {
    const reframe = new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleReframeDragEnd,
      onDragMove: handleReframeDragUpdate,
      onDragStart: handleReframeDragUpdate,
      onMouseMove: handleReframeMouseMove,
      onMouseLeave: handleReframeMouseLeave,
      tag: dragTypes.REFRAME,
    });
    const start = new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: update => handleScrubberDragEnd(dragTypes.SHIFT_START, update),
      onDragMove: update => handleScrubberDragUpdate(dragTypes.SHIFT_START, update),
      onDragStart: update => handleScrubberDragUpdate(dragTypes.SHIFT_START, update),
      onMouseEnter: handleScrubberEnterLeave,
      onMouseLeave: handleScrubberEnterLeave,
      tag: dragTypes.SHIFT_START,
    });
    const end = new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: update => handleScrubberDragEnd(dragTypes.SHIFT_END, update),
      onDragMove: update => handleScrubberDragUpdate(dragTypes.SHIFT_END, update),
      onDragStart: update => handleScrubberDragUpdate(dragTypes.SHIFT_END, update),
      onMouseEnter: handleScrubberEnterLeave,
      onMouseLeave: handleScrubberEnterLeave,
      tag: dragTypes.SHIFT_END,
    });
    draggerReframeRef.current = reframe;
    draggerStartRef.current = start;
    draggerEndRef.current = end;
    return () => {
      if (draggerReframeRef.current === reframe) {
        draggerReframeRef.current = null;
      }
      if (draggerStartRef.current === start) {
        draggerStartRef.current = null;
      }
      if (draggerEndRef.current === end) {
        draggerEndRef.current = null;
      }
      reframe.dispose();
      start.dispose();
      end.dispose();
    };
  }, [
    getDraggingBounds,
    handleReframeDragEnd,
    handleReframeDragUpdate,
    handleReframeMouseLeave,
    handleReframeMouseMove,
    handleScrubberDragEnd,
    handleScrubberDragUpdate,
    handleScrubberEnterLeave,
  ]);

  /**
   * Resets the zoom to fully zoomed out.
   */
  const resetTimeZoom = React.useCallback(() => {
    propsRef.current.updateViewRangeTime(0, 1);
  }, []);

  /**
   * Renders the difference between where the drag started and the current
   * position, e.g. the red or blue highlight.
   *
   * @returns React.Node[]
   */
  const getMarkers = (from: number, to: number, isShift: boolean) => {
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
  };

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
  let cursorPosition: string | undefined;
  if (!haveNextTimeRange && cursor != null && !preventCursorLine) {
    cursorPosition = `${cursor * 100}%`;
  }

  return (
    <div aria-hidden className="ViewingLayer" style={{ height }}>
      {(viewStart !== 0 || viewEnd !== 1) && (
        <Button onClick={resetTimeZoom} className="ViewingLayer--resetZoom" htmlType="button">
          Reset Selection
        </Button>
      )}
      <svg
        height={height}
        className="ViewingLayer--graph"
        ref={rootRef}
        onMouseDown={event => draggerReframeRef.current?.handleMouseDown(event)}
        onMouseLeave={event => draggerReframeRef.current?.handleMouseLeave(event)}
        onMouseMove={event => draggerReframeRef.current?.handleMouseMove(event)}
      >
        {leftInactive > 0 && (
          <rect x={0} y={0} height="100%" width={`${leftInactive}%`} className="ViewingLayer--inactive" />
        )}
        {rightInactive > 0 && (
          <rect
            x={`${100 - rightInactive}%`}
            y={0}
            height="100%"
            width={`${rightInactive}%`}
            className="ViewingLayer--inactive"
          />
        )}
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
        {shiftStart != null && getMarkers(viewStart, shiftStart, true)}
        {shiftEnd != null && getMarkers(viewEnd, shiftEnd, true)}
        <Scrubber
          isDragging={shiftStart != null}
          onMouseDown={event => draggerStartRef.current?.handleMouseDown(event)}
          onMouseEnter={event => draggerStartRef.current?.handleMouseEnter(event)}
          onMouseLeave={event => draggerStartRef.current?.handleMouseLeave(event)}
          position={viewStart || 0}
        />
        <Scrubber
          isDragging={shiftEnd != null}
          position={viewEnd || 1}
          onMouseDown={event => draggerEndRef.current?.handleMouseDown(event)}
          onMouseEnter={event => draggerEndRef.current?.handleMouseEnter(event)}
          onMouseLeave={event => draggerEndRef.current?.handleMouseLeave(event)}
        />
        {reframe != null && getMarkers(reframe.anchor, reframe.shift, false)}
      </svg>
      {/* fullOverlay updates the mouse cursor blocks mouse events */}
      {haveNextTimeRange && <div className="ViewingLayer--fullOverlay" />}
    </div>
  );
}

export default React.memo(ViewingLayer);
