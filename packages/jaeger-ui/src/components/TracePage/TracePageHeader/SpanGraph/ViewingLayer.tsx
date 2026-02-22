// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Button } from 'antd';
import cx from 'classnames';
import * as React from 'react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

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
 * Interface for the imperative handle exposed by ViewingLayer.
 * Used for testing purposes.
 */
export interface ViewingLayerHandle {
  _root: Element | TNil;
  _setRoot: (elm: SVGElement | TNil) => void;
  _getDraggingBounds: (tag: string | TNil) => DraggableBounds;
  _handleReframeMouseMove: (update: DraggingUpdate) => void;
  _handleReframeMouseLeave: () => void;
  _handleReframeDragUpdate: (update: DraggingUpdate) => void;
  _handleReframeDragEnd: (update: DraggingUpdate) => void;
  _handleScrubberEnterLeave: (update: DraggingUpdate) => void;
  _handleScrubberDragUpdate: (update: DraggingUpdate) => void;
  _handleScrubberDragEnd: (update: DraggingUpdate) => void;
  _getMarkers: (from: number, to: number, isShift: boolean) => React.ReactNode[];
  state: { preventCursorLine: boolean };
  setState: (state: { preventCursorLine: boolean }) => void;
}

/**
 * `ViewingLayer` is rendered on top of the Canvas rendering of the minimap and
 * handles showing the current view range and handles mouse UX for modifying it.
 */
const ViewingLayer = React.memo(
  React.forwardRef<ViewingLayerHandle, ViewingLayerProps>(function ViewingLayer(props, ref) {
    const { height, viewRange, numTicks, updateNextViewRangeTime, updateViewRangeTime } = props;

    const [preventCursorLine, setPreventCursorLine] = useState(false);
    const rootRef = useRef<Element | TNil>(undefined);

    // Use refs to store the latest props/state to avoid stale closures in DraggableManager callbacks
    const viewRangeRef = useRef(viewRange);
    const updateNextViewRangeTimeRef = useRef(updateNextViewRangeTime);
    const updateViewRangeTimeRef = useRef(updateViewRangeTime);

    // Keep refs in sync with props
    useEffect(() => {
      viewRangeRef.current = viewRange;
    }, [viewRange]);

    useEffect(() => {
      updateNextViewRangeTimeRef.current = updateNextViewRangeTime;
    }, [updateNextViewRangeTime]);

    useEffect(() => {
      updateViewRangeTimeRef.current = updateViewRangeTime;
    }, [updateViewRangeTime]);

    const setRoot = useCallback((elm: SVGElement | TNil) => {
      rootRef.current = elm;
    }, []);

    const getDraggingBounds = useCallback((tag: string | TNil): DraggableBounds => {
      if (!rootRef.current) {
        throw new Error('invalid state');
      }
      const { left: clientXLeft, width } = rootRef.current.getBoundingClientRect();
      const [viewStart, viewEnd] = viewRangeRef.current.time.current;
      let maxValue = 1;
      let minValue = 0;
      if (tag === dragTypes.SHIFT_START) {
        maxValue = viewEnd;
      } else if (tag === dragTypes.SHIFT_END) {
        minValue = viewStart;
      }
      return { clientXLeft, maxValue, minValue, width };
    }, []);

    const handleReframeMouseMove = useCallback(({ value }: DraggingUpdate) => {
      updateNextViewRangeTimeRef.current({ cursor: value });
    }, []);

    const handleReframeMouseLeave = useCallback(() => {
      updateNextViewRangeTimeRef.current({ cursor: null });
    }, []);

    const handleReframeDragUpdate = useCallback(({ value }: DraggingUpdate) => {
      const shift = value;
      const { time } = viewRangeRef.current;
      const anchor = time.reframe ? time.reframe.anchor : shift;
      const update = { reframe: { anchor, shift } };
      updateNextViewRangeTimeRef.current(update);
    }, []);

    const handleReframeDragEnd = useCallback(({ manager, value }: DraggingUpdate) => {
      const { time } = viewRangeRef.current;
      const anchor = time.reframe ? time.reframe.anchor : value;
      const [start, end] = value < anchor ? [value, anchor] : [anchor, value];
      manager.resetBounds();
      updateViewRangeTimeRef.current(start, end, 'minimap');
    }, []);

    const handleScrubberEnterLeave = useCallback(({ type }: DraggingUpdate) => {
      const shouldPreventCursorLine = type === EUpdateTypes.MouseEnter;
      setPreventCursorLine(shouldPreventCursorLine);
    }, []);

    const handleScrubberDragUpdate = useCallback(({ event, tag, type, value }: DraggingUpdate) => {
      if (type === EUpdateTypes.DragStart) {
        event.stopPropagation();
      }
      if (tag === dragTypes.SHIFT_START) {
        updateNextViewRangeTimeRef.current({ shiftStart: value });
      } else if (tag === dragTypes.SHIFT_END) {
        updateNextViewRangeTimeRef.current({ shiftEnd: value });
      }
    }, []);

    const handleScrubberDragEnd = useCallback(({ manager, tag, value }: DraggingUpdate) => {
      const [viewStart, viewEnd] = viewRangeRef.current.time.current;
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
      setPreventCursorLine(false);
      updateViewRangeTimeRef.current(update[0], update[1], 'minimap');
    }, []);

    /**
     * Resets the zoom to fully zoomed out.
     */
    const resetTimeZoomClickHandler = useCallback(() => {
      updateViewRangeTimeRef.current(0, 1);
    }, []);

    /**
     * Renders the difference between where the drag started and the current
     * position, e.g. the red or blue highlight.
     *
     * @returns React.Node[]
     */
    const getMarkers = useCallback(
      (from: number, to: number, isShift: boolean) => {
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
      },
      [height]
    );

    // Create DraggableManager instances using refs to ensure they persist across renders
    const draggerReframeRef = useRef<DraggableManager | null>(null);
    const draggerStartRef = useRef<DraggableManager | null>(null);
    const draggerEndRef = useRef<DraggableManager | null>(null);

    // Initialize DraggableManagers once
    draggerReframeRef.current ??= new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleReframeDragEnd,
      onDragMove: handleReframeDragUpdate,
      onDragStart: handleReframeDragUpdate,
      onMouseMove: handleReframeMouseMove,
      onMouseLeave: handleReframeMouseLeave,
      tag: dragTypes.REFRAME,
    });

    draggerStartRef.current ??= new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleScrubberDragEnd,
      onDragMove: handleScrubberDragUpdate,
      onDragStart: handleScrubberDragUpdate,
      onMouseEnter: handleScrubberEnterLeave,
      onMouseLeave: handleScrubberEnterLeave,
      tag: dragTypes.SHIFT_START,
    });

    draggerEndRef.current ??= new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleScrubberDragEnd,
      onDragMove: handleScrubberDragUpdate,
      onDragStart: handleScrubberDragUpdate,
      onMouseEnter: handleScrubberEnterLeave,
      onMouseLeave: handleScrubberEnterLeave,
      tag: dragTypes.SHIFT_END,
    });

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        draggerReframeRef.current?.dispose();
        draggerStartRef.current?.dispose();
        draggerEndRef.current?.dispose();
      };
    }, []);

    // Expose imperative handle for testing
    useImperativeHandle(
      ref,
      () => ({
        _root: rootRef.current,
        _setRoot: setRoot,
        _getDraggingBounds: getDraggingBounds,
        _handleReframeMouseMove: handleReframeMouseMove,
        _handleReframeMouseLeave: handleReframeMouseLeave,
        _handleReframeDragUpdate: handleReframeDragUpdate,
        _handleReframeDragEnd: handleReframeDragEnd,
        _handleScrubberEnterLeave: handleScrubberEnterLeave,
        _handleScrubberDragUpdate: handleScrubberDragUpdate,
        _handleScrubberDragEnd: handleScrubberDragEnd,
        _getMarkers: getMarkers,
        state: { preventCursorLine },
        setState: (state: { preventCursorLine: boolean }) => setPreventCursorLine(state.preventCursorLine),
      }),
      [
        setRoot,
        getDraggingBounds,
        handleReframeMouseMove,
        handleReframeMouseLeave,
        handleReframeDragUpdate,
        handleReframeDragEnd,
        handleScrubberEnterLeave,
        handleScrubberDragUpdate,
        handleScrubberDragEnd,
        getMarkers,
        preventCursorLine,
      ]
    );

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
          <Button onClick={resetTimeZoomClickHandler} className="ViewingLayer--resetZoom" htmlType="button">
            Reset Selection
          </Button>
        )}
        <svg
          height={height}
          className="ViewingLayer--graph"
          ref={setRoot}
          onMouseDown={draggerReframeRef.current.handleMouseDown}
          onMouseLeave={draggerReframeRef.current.handleMouseLeave}
          onMouseMove={draggerReframeRef.current.handleMouseMove}
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
            onMouseDown={draggerStartRef.current.handleMouseDown}
            onMouseEnter={draggerStartRef.current.handleMouseEnter}
            onMouseLeave={draggerStartRef.current.handleMouseLeave}
            position={viewStart || 0}
          />
          <Scrubber
            isDragging={shiftEnd != null}
            position={viewEnd || 1}
            onMouseDown={draggerEndRef.current.handleMouseDown}
            onMouseEnter={draggerEndRef.current.handleMouseEnter}
            onMouseLeave={draggerEndRef.current.handleMouseLeave}
          />
          {reframe != null && getMarkers(reframe.anchor, reframe.shift, false)}
        </svg>
        {/* fullOverlay updates the mouse cursor blocks mouse events */}
        {haveNextTimeRange && <div className="ViewingLayer--fullOverlay" />}
      </div>
    );
  })
);

ViewingLayer.displayName = 'ViewingLayer';

export default ViewingLayer;
