// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import cx from 'classnames';

import { TUpdateViewRangeTimeFunction, IViewRangeTime, ViewRangeTimeUpdate } from '../../types';
import { TNil } from '../../../../types';
import DraggableManager, { DraggableBounds, DraggingUpdate } from '../../../../utils/DraggableManager';

import './TimelineViewingLayer.css';

type TimelineViewingLayerProps = {
  boundsInvalidator: any | null | undefined;
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

function mapFromViewSubRange(viewStart: number, viewEnd: number, value: number) {
  return viewStart + value * (viewEnd - viewStart);
}

function mapToViewSubRange(viewStart: number, viewEnd: number, value: number) {
  return (value - viewStart) / (viewEnd - viewStart);
}

function getNextViewLayout(start: number, position: number): TDraggingLeftLayout | TOutOfViewLayout {
  let [left, right] = start < position ? [start, position] : [position, start];
  if (left >= 1 || right <= 0) return { isOutOfView: true };
  if (left < 0) left = 0;
  if (right > 1) right = 1;
  return {
    isDraggingLeft: start > position,
    left: `${left * 100}%`,
    width: `${(right - left) * 100}%`,
  };
}

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
  if (isOutOfView(layout)) return null;

  const { isDraggingLeft, left, width } = layout;
  const cls = cx({
    isDraggingLeft,
    isDraggingRight: !isDraggingLeft,
    isReframeDrag: !isShift,
    isShiftDrag: isShift,
  });

  return <div className={`TimelineViewingLayer--dragged ${cls}`} style={{ left, width }} />;
}

function TimelineViewingLayer(props: TimelineViewingLayerProps) {
  const { boundsInvalidator, updateNextViewRangeTime, updateViewRangeTime, viewRangeTime } = props;

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const draggerRef = React.useRef<DraggableManager | null>(null);

  const getDraggingBounds = React.useCallback((): DraggableBounds => {
    const current = rootRef.current;
    if (!current) {
      throw new Error('Component must be mounted in order to determine DraggableBounds');
    }
    const { left: clientXLeft, width } = current.getBoundingClientRect();
    return { clientXLeft, width };
  }, []);

  const getAnchorAndShift = React.useCallback(
    (value: number) => {
      const { current, reframe } = viewRangeTime;
      const [viewStart, viewEnd] = current;
      const shift = mapFromViewSubRange(viewStart, viewEnd, value);
      const anchor = reframe ? reframe.anchor : shift;
      return { anchor, shift };
    },
    [viewRangeTime]
  );

  const handleReframeMouseMove = React.useCallback(
    ({ value }: DraggingUpdate) => {
      const [viewStart, viewEnd] = viewRangeTime.current;
      const cursor = mapFromViewSubRange(viewStart, viewEnd, value);
      updateNextViewRangeTime({ cursor });
    },
    [viewRangeTime, updateNextViewRangeTime]
  );

  const handleReframeMouseLeave = React.useCallback(() => {
    updateNextViewRangeTime({ cursor: undefined });
  }, [updateNextViewRangeTime]);

  const handleReframeDragUpdate = React.useCallback(
    ({ value }: DraggingUpdate) => {
      const { anchor, shift } = getAnchorAndShift(value);
      updateNextViewRangeTime({ reframe: { anchor, shift } });
    },
    [getAnchorAndShift, updateNextViewRangeTime]
  );

  const handleReframeDragEnd = React.useCallback(
    ({ manager, value }: DraggingUpdate) => {
      const { anchor, shift } = getAnchorAndShift(value);
      const [start, end] = shift < anchor ? [shift, anchor] : [anchor, shift];
      manager.resetBounds();
      updateViewRangeTime(start, end, 'timeline-header');
    },
    [getAnchorAndShift, updateViewRangeTime]
  );

  // Create DraggableManager once
  if (!draggerRef.current) {
    draggerRef.current = new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleReframeDragEnd,
      onDragMove: handleReframeDragUpdate,
      onDragStart: handleReframeDragUpdate,
      onMouseLeave: handleReframeMouseLeave,
      onMouseMove: handleReframeMouseMove,
    });
  }

  // componentDidUpdate(boundsInvalidator)
  React.useEffect(() => {
    draggerRef.current?.resetBounds();
  }, [boundsInvalidator]);

  // componentWillUnmount
  React.useEffect(() => {
    return () => {
      draggerRef.current?.dispose();
    };
  }, []);

  const { current, cursor, reframe, shiftEnd, shiftStart } = viewRangeTime;
  const [viewStart, viewEnd] = current;
  const haveNextTimeRange = reframe != null || shiftEnd != null || shiftStart != null;

  let cusrorPosition: string | TNil;
  if (!haveNextTimeRange && cursor != null && cursor >= viewStart && cursor <= viewEnd) {
    cusrorPosition = `${mapToViewSubRange(viewStart, viewEnd, cursor) * 100}%`;
  }

  return (
    <div
      aria-hidden
      className="TimelineViewingLayer"
      ref={rootRef}
      onMouseDown={draggerRef.current!.handleMouseDown}
      onMouseLeave={draggerRef.current!.handleMouseLeave}
      onMouseMove={draggerRef.current!.handleMouseMove}
    >
      {cusrorPosition != null && (
        <div className="TimelineViewingLayer--cursorGuide" style={{ left: cusrorPosition }} />
      )}
      {reframe != null && getMarkers(viewStart, viewEnd, reframe.anchor, reframe.shift, false)}
      {shiftEnd != null && getMarkers(viewStart, viewEnd, viewEnd, shiftEnd, true)}
      {shiftStart != null && getMarkers(viewStart, viewEnd, viewStart, shiftStart, true)}
    </div>
  );
}

export default React.memo(TimelineViewingLayer);
