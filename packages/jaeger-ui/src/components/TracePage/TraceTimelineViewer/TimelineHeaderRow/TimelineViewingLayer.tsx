// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';

import { TUpdateViewRangeTimeFunction, IViewRangeTime, ViewRangeTimeUpdate } from '../../types';
import { TNil } from '../../../../types';
import DraggableManager, { DraggableBounds, DraggingUpdate } from '../../../../utils/DraggableManager';

import './TimelineViewingLayer.css';

type TimelineViewingLayerProps = {
  /**
   * `boundsInvalidator` is an arbitrary value that lets the component know the
   * bounds for dragging need to be recalculated. In practice, the name column
   * width serves fine for this.
   */
  boundsInvalidator: unknown;
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  viewRangeTime: IViewRangeTime;
};

type TDraggingLeftLayout = {
  isDraggingLeft: boolean;
  left: string;
  width: string;
};

type TOutOfViewLayout = {
  isOutOfView: true;
};

function isOutOfView(layout: TDraggingLeftLayout | TOutOfViewLayout): layout is TOutOfViewLayout {
  return Reflect.has(layout, 'isOutOfView');
}

/**
 * Map from a sub range to the greater view range, e.g, when the view range is
 * the middle half ([0.25, 0.75]), a value of 0.25 becomes 3/8.
 * @returns {number}
 */
function mapFromViewSubRange(viewStart: number, viewEnd: number, value: number) {
  return viewStart + value * (viewEnd - viewStart);
}

/**
 * Map a value from the view ([0, 1]) to a sub-range, e.g, when the view range is
 * the middle half ([0.25, 0.75]), a value of 3/8 becomes 1/4.
 * @returns {number}
 */
function mapToViewSubRange(viewStart: number, viewEnd: number, value: number) {
  return (value - viewStart) / (viewEnd - viewStart);
}

/**
 * Get the layout for the "next" view range time, e.g. the difference from the
 * drag start and the drag end. This is driven by `shiftStart`, `shiftEnd` or
 * `reframe` on `props.viewRangeTime`, not by the current state of the
 * component. So, it reflects in-progress dragging from the span minimap.
 */
function getNextViewLayout(start: number, position: number): TDraggingLeftLayout | TOutOfViewLayout {
  let [left, right] = start < position ? [start, position] : [position, start];
  if (left >= 1 || right <= 0) {
    return { isOutOfView: true };
  }
  if (left < 0) {
    left = 0;
  }
  if (right > 1) {
    right = 1;
  }
  return {
    isDraggingLeft: start > position,
    left: `${left * 100}%`,
    width: `${(right - left) * 100}%`,
  };
}

/**
 * Render the visual indication of the "next" view range.
 */
function getMarkers(
  viewStart: number,
  viewEnd: number,
  from: number,
  to: number,
  isShift: boolean
): React.ReactNode {
  const mappedFrom = mapToViewSubRange(viewStart, viewEnd, from);
  const mappedTo = mapToViewSubRange(viewStart, viewEnd, to);
  const layout = getNextViewLayout(mappedFrom, mappedTo);
  if (isOutOfView(layout)) {
    return null;
  }
  const { isDraggingLeft, left, width } = layout;
  const cls = cx({
    isDraggingLeft,
    isDraggingRight: !isDraggingLeft,
    isReframeDrag: !isShift,
    isShiftDrag: isShift,
  });
  return <div className={`TimelineViewingLayer--dragged ${cls}`} style={{ left, width }} />;
}

/**
 * `TimelineViewingLayer` is rendered on top of the TimelineHeaderRow time
 * labels; it handles showing the current view range and handles mouse UX for
 * modifying it.
 */
function TimelineViewingLayer(props: TimelineViewingLayerProps) {
  const { boundsInvalidator, viewRangeTime } = props;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const propsRef = React.useRef(props);
  React.useLayoutEffect(() => {
    propsRef.current = props;
  });

  const getDraggingBounds = React.useCallback((): DraggableBounds => {
    const current = rootRef.current;
    if (!current) {
      throw new Error('Component must be mounted in order to determine DraggableBounds');
    }
    const { left: clientXLeft, width } = current.getBoundingClientRect();
    return { clientXLeft, width };
  }, []);

  const getAnchorAndShift = React.useCallback((value: number) => {
    const { current, reframe } = propsRef.current.viewRangeTime;
    const [viewStart, viewEnd] = current;
    const shift = mapFromViewSubRange(viewStart, viewEnd, value);
    const anchor = reframe ? reframe.anchor : shift;
    return { anchor, shift };
  }, []);

  const handleReframeMouseMove = React.useCallback(({ value }: DraggingUpdate) => {
    const [viewStart, viewEnd] = propsRef.current.viewRangeTime.current;
    const cursor = mapFromViewSubRange(viewStart, viewEnd, value);
    propsRef.current.updateNextViewRangeTime({ cursor });
  }, []);

  const handleReframeMouseLeave = React.useCallback(() => {
    propsRef.current.updateNextViewRangeTime({ cursor: undefined });
  }, []);

<<<<<<< HEAD
  render() {
    const { viewRangeTime } = this.props;
    const { current, cursor, reframe, shiftEnd, shiftStart } = viewRangeTime;
    const [viewStart, viewEnd] = current;
    const haveNextTimeRange = reframe != null || shiftEnd != null || shiftStart != null;
    let cursorPosition: string | TNil;
    if (!haveNextTimeRange && cursor != null && cursor >= viewStart && cursor <= viewEnd) {
      cursorPosition = `${mapToViewSubRange(viewStart, viewEnd, cursor) * 100}%`;
    }
    return (
      <div
        aria-hidden
        className="TimelineViewingLayer"
        ref={this._root}
        onMouseDown={this._draggerReframe.handleMouseDown}
        onMouseLeave={this._draggerReframe.handleMouseLeave}
        onMouseMove={this._draggerReframe.handleMouseMove}
      >
        {cursorPosition != null && (
          <div className="TimelineViewingLayer--cursorGuide" style={{ left: cursorPosition }} />
        )}
        {reframe != null && getMarkers(viewStart, viewEnd, reframe.anchor, reframe.shift, false)}
        {shiftEnd != null && getMarkers(viewStart, viewEnd, viewEnd, shiftEnd, true)}
        {shiftStart != null && getMarkers(viewStart, viewEnd, viewStart, shiftStart, true)}
      </div>
    );
=======
  const handleReframeDragUpdate = React.useCallback(
    ({ value }: DraggingUpdate) => {
      const { anchor, shift } = getAnchorAndShift(value);
      const update = { reframe: { anchor, shift } };
      propsRef.current.updateNextViewRangeTime(update);
    },
    [getAnchorAndShift]
  );

  const handleReframeDragEnd = React.useCallback(
    ({ manager, value }: DraggingUpdate) => {
      const { anchor, shift } = getAnchorAndShift(value);
      const [start, end] = shift < anchor ? [shift, anchor] : [anchor, shift];
      manager.resetBounds();
      propsRef.current.updateViewRangeTime(start, end, 'timeline-header');
    },
    [getAnchorAndShift]
  );

  const draggerReframeRef = React.useRef<DraggableManager | null>(null);
  React.useLayoutEffect(() => {
    const manager = new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleReframeDragEnd,
      onDragMove: handleReframeDragUpdate,
      onDragStart: handleReframeDragUpdate,
      onMouseLeave: handleReframeMouseLeave,
      onMouseMove: handleReframeMouseMove,
    });
    draggerReframeRef.current = manager;
    return () => {
      if (draggerReframeRef.current === manager) {
        draggerReframeRef.current = null;
      }
      manager.dispose();
    };
  }, [
    getDraggingBounds,
    handleReframeDragEnd,
    handleReframeDragUpdate,
    handleReframeMouseLeave,
    handleReframeMouseMove,
  ]);

  const handleMouseDown = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    draggerReframeRef.current?.handleMouseDown(event);
  }, []);

  const handleMouseLeave = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    draggerReframeRef.current?.handleMouseLeave(event);
  }, []);

  const handleMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    draggerReframeRef.current?.handleMouseMove(event);
  }, []);

  const previousBoundsInvalidatorRef = React.useRef(boundsInvalidator);
  React.useLayoutEffect(() => {
    const manager = draggerReframeRef.current;
    if (!manager) {
      previousBoundsInvalidatorRef.current = boundsInvalidator;
      return;
    }
    if (previousBoundsInvalidatorRef.current !== boundsInvalidator) {
      manager.resetBounds();
      previousBoundsInvalidatorRef.current = boundsInvalidator;
    }
  }, [boundsInvalidator]);

  const { current, cursor, reframe, shiftEnd, shiftStart } = viewRangeTime;
  const [viewStart, viewEnd] = current;
  const haveNextTimeRange = reframe != null || shiftEnd != null || shiftStart != null;
  let cursorPosition: string | TNil;
  if (!haveNextTimeRange && cursor != null && cursor >= viewStart && cursor <= viewEnd) {
    cursorPosition = `${mapToViewSubRange(viewStart, viewEnd, cursor) * 100}%`;
>>>>>>> upstream/main
  }

  return (
    <div
      aria-hidden
      className="TimelineViewingLayer"
      ref={rootRef}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {cursorPosition != null && (
        <div className="TimelineViewingLayer--cursorGuide" style={{ left: cursorPosition }} />
      )}
      {reframe != null && getMarkers(viewStart, viewEnd, reframe.anchor, reframe.shift, false)}
      {shiftEnd != null && getMarkers(viewStart, viewEnd, viewEnd, shiftEnd, true)}
      {shiftStart != null && getMarkers(viewStart, viewEnd, viewStart, shiftStart, true)}
    </div>
  );
}

export default React.memo(TimelineViewingLayer);
