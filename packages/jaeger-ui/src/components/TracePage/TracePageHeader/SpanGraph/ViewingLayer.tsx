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
const ViewingLayer: React.FC<ViewingLayerProps> = ({
  height,
  numTicks,
  updateViewRangeTime,
  updateNextViewRangeTime,
  viewRange,
}) => {
  /**
   * Cursor line should not be drawn when the mouse is over the scrubber handle.
   */
  const [preventCursorLine, setPreventCursorLine] = React.useState(false);

  const rootRef = React.useRef<SVGSVGElement | null>(null);

  /**
   * `_draggerReframe` handles clicking and dragging on the `ViewingLayer` to
   * redefined the view range.
   */
  const draggerReframeRef = React.useRef<DraggableManager | null>(null);

  /**
   * `_draggerStart` handles dragging the left scrubber to adjust the start of
   * the view range.
   */
  const draggerStartRef = React.useRef<DraggableManager | null>(null);

  /**
   * `_draggerEnd` handles dragging the right scrubber to adjust the end of
   * the view range.
   */
  const draggerEndRef = React.useRef<DraggableManager | null>(null);

  const onStartMouseEnter = React.useCallback((e: React.MouseEvent<SVGSVGElement | HTMLDivElement>) => {
    draggerStartRef.current?.handleMouseEnter(e);
  }, []);

  const onStartMouseLeave = React.useCallback((e: React.MouseEvent<SVGSVGElement | HTMLDivElement>) => {
    draggerStartRef.current?.handleMouseLeave(e);
  }, []);

  const onStartMouseDown = React.useCallback((e: React.MouseEvent<SVGSVGElement | HTMLDivElement>) => {
    draggerStartRef.current?.handleMouseDown(e);
  }, []);

  const getDraggingBounds = React.useCallback(
    (tag: string | TNil): DraggableBounds => {
      if (!rootRef.current) {
        throw new Error('invalid state');
      }

      const { left: clientXLeft, width } = rootRef.current.getBoundingClientRect();
      const [viewStart, viewEnd] = viewRange.time.current;

      let maxValue = 1;
      let minValue = 0;

      if (tag === dragTypes.SHIFT_START) {
        maxValue = viewEnd;
      } else if (tag === dragTypes.SHIFT_END) {
        minValue = viewStart;
      }

      return { clientXLeft, maxValue, minValue, width };
    },
    [viewRange]
  );

  const handleReframeMouseMove = React.useCallback(
    ({ value }: DraggingUpdate) => {
      updateNextViewRangeTime({ cursor: value });
    },
    [updateNextViewRangeTime]
  );

  const handleReframeMouseLeave = React.useCallback(() => {
    updateNextViewRangeTime({ cursor: null });
  }, [updateNextViewRangeTime]);

  const handleReframeDragUpdate = React.useCallback(
    ({ value }: DraggingUpdate) => {
      const shift = value;
      const { time } = viewRange;
      const anchor = time.reframe ? time.reframe.anchor : shift;
      updateNextViewRangeTime({ reframe: { anchor, shift } });
    },
    [viewRange, updateNextViewRangeTime]
  );

  const handleReframeDragEnd = React.useCallback(
    ({ manager, value }: DraggingUpdate) => {
      const { time } = viewRange;
      const anchor = time.reframe ? time.reframe.anchor : value;
      const [start, end] = value < anchor ? [value, anchor] : [anchor, value];
      manager.resetBounds();
      updateViewRangeTime(start, end, 'minimap');
    },
    [viewRange, updateViewRangeTime]
  );

  const handleScrubberEnterLeave = React.useCallback(({ type }: DraggingUpdate) => {
    setPreventCursorLine(type === EUpdateTypes.MouseEnter);
  }, []);

  const handleScrubberDragUpdate = React.useCallback(
    ({ event, tag, type, value }: DraggingUpdate) => {
      if (type === EUpdateTypes.DragStart) {
        event.stopPropagation();
      }
      if (tag === dragTypes.SHIFT_START) {
        updateNextViewRangeTime({ shiftStart: value });
      } else if (tag === dragTypes.SHIFT_END) {
        updateNextViewRangeTime({ shiftEnd: value });
      }
    },
    [updateNextViewRangeTime]
  );

  const handleScrubberDragEnd = React.useCallback(
    ({ manager, tag, value }: DraggingUpdate) => {
      const [viewStart, viewEnd] = viewRange.time.current;
      const update = tag === dragTypes.SHIFT_START ? [value, viewEnd] : [viewStart, value];

      manager.resetBounds();
      setPreventCursorLine(false);
      updateViewRangeTime(update[0], update[1], 'minimap');
    },
    [viewRange, updateViewRangeTime]
  );

  /**
   * Resets the zoom to fully zoomed out.
   */
  const resetTimeZoomClickHandler = React.useCallback(() => {
    updateViewRangeTime(0, 1);
  }, [updateViewRangeTime]);

  React.useEffect(() => {
    draggerReframeRef.current = new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleReframeDragEnd,
      onDragMove: handleReframeDragUpdate,
      onDragStart: handleReframeDragUpdate,
      onMouseMove: handleReframeMouseMove,
      onMouseLeave: handleReframeMouseLeave,
      tag: dragTypes.REFRAME,
    });

    draggerStartRef.current = new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleScrubberDragEnd,
      onDragMove: handleScrubberDragUpdate,
      onDragStart: handleScrubberDragUpdate,
      onMouseEnter: handleScrubberEnterLeave,
      onMouseLeave: handleScrubberEnterLeave,
      tag: dragTypes.SHIFT_START,
    });

    draggerEndRef.current = new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleScrubberDragEnd,
      onDragMove: handleScrubberDragUpdate,
      onDragStart: handleScrubberDragUpdate,
      onMouseEnter: handleScrubberEnterLeave,
      onMouseLeave: handleScrubberEnterLeave,
      tag: dragTypes.SHIFT_END,
    });

    return () => {
      draggerReframeRef.current?.dispose();
      draggerStartRef.current?.dispose();
      draggerEndRef.current?.dispose();
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

  const getMarkers = (from: number, to: number, isShift: boolean) => {
    const layout = getNextViewLayout(from, to);
    const cls = cx({ isShiftDrag: isShift, isReframeDrag: !isShift });
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

  return (
    <div aria-hidden className="ViewingLayer" style={{ height }}>
      {(viewStart !== 0 || viewEnd !== 1) && (
        <Button onClick={resetTimeZoomClickHandler} className="ViewingLayer--resetZoom" htmlType="button">
          Reset Selection
        </Button>
      )}
      <svg
        height={height}
        className="ViewingLayer--graph"
        ref={rootRef}
        onMouseDown={draggerReframeRef.current?.handleMouseDown}
        onMouseLeave={draggerReframeRef.current?.handleMouseLeave}
        onMouseMove={draggerReframeRef.current?.handleMouseMove}
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
          onMouseDown={onStartMouseDown}
          onMouseEnter={onStartMouseEnter}
          onMouseLeave={onStartMouseLeave}
          position={viewStart || 0}
        />
        <Scrubber
          isDragging={shiftEnd != null}
          position={viewEnd || 1}
          onMouseDown={onStartMouseDown}
          onMouseEnter={onStartMouseEnter}
          onMouseLeave={onStartMouseLeave}
        />
        {reframe != null && getMarkers(reframe.anchor, reframe.shift, false)}
      </svg>
      {/* fullOverlay updates the mouse cursor blocks mouse events */}
      {haveNextTimeRange && <div className="ViewingLayer--fullOverlay" />}
    </div>
  );
};

export default React.memo(ViewingLayer);
