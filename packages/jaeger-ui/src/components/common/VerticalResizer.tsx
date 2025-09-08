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

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import cx from 'classnames';

import { TNil } from '../../types';
import DraggableManager, { DraggableBounds, DraggingUpdate } from '../../utils/DraggableManager';

import './VerticalResizer.css';

type VerticalResizerProps = {
  max: number;
  min: number;
  onChange: (newSize: number) => void;
  position: number;
  rightSide?: boolean;
};

const VerticalResizer: React.FC<VerticalResizerProps> = ({ max, min, onChange, position, rightSide }) => {
  const [dragPosition, setDragPosition] = useState<number | TNil>(null);
  const rootElmRef = useRef<HTMLDivElement | null>(null);

  const getDraggingBounds = useCallback((): DraggableBounds => {
    if (!rootElmRef.current) {
      return {
        clientXLeft: 0,
        width: 0,
        minValue: 0,
        maxValue: 0,
      };
    }
    const { left: clientXLeft, width } = rootElmRef.current.getBoundingClientRect();

    let adjustedMin = min;
    let adjustedMax = max;

    if (rightSide) {
      [adjustedMin, adjustedMax] = [1 - max, 1 - min];
    }

    return {
      clientXLeft,
      width,
      minValue: adjustedMin,
      maxValue: adjustedMax,
    };
  }, [min, max, rightSide]);

  const handleDragUpdate = useCallback(
    ({ value }: DraggingUpdate) => {
      const newDragPosition = rightSide ? 1 - value : value;
      setDragPosition(newDragPosition);
    },
    [rightSide]
  );

  const handleDragEnd = useCallback(
    ({ manager, value }: DraggingUpdate) => {
      manager.resetBounds();
      setDragPosition(null);
      const newDragPosition = rightSide ? 1 - value : value;
      onChange(newDragPosition);
    },
    [onChange, rightSide]
  );

  const dragManager = useMemo(
    () =>
      new DraggableManager({
        getBounds: getDraggingBounds,
        onDragEnd: handleDragEnd,
        onDragMove: handleDragUpdate,
        onDragStart: handleDragUpdate,
      }),
    [getDraggingBounds, handleDragEnd, handleDragUpdate]
  );

  useEffect(() => {
    return () => {
      dragManager.dispose();
    };
  }, [dragManager]);

  let draggerStyle: React.CSSProperties;
  let isDraggingCls = '';
  const gripStyle: React.CSSProperties = { left: `${position * 100}%` };

  if (dragManager.isDragging() && dragPosition != null) {
    isDraggingCls = cx({
      isDraggingLeft: dragPosition < position,
      isDraggingRight: dragPosition > position,
    });

    // Draw a highlight from the current dragged position back to the original
    // position, e.g. highlight the change. Draw the highlight via `left` and
    // `right` css styles (simpler than using `width`).
    const draggerLeft = `${Math.min(position, dragPosition) * 100}%`;
    // subtract 1px for draggerRight to deal with the right border being off
    // by 1px when dragging left
    const draggerRight = `calc(${(1 - Math.max(position, dragPosition)) * 100}% - 1px)`;

    draggerStyle = { left: draggerLeft, right: draggerRight };
  } else {
    draggerStyle = gripStyle;
  }

  return (
    <div
      className={`VerticalResizer ${isDraggingCls} ${rightSide ? 'is-flipped' : ''}`}
      ref={rootElmRef}
      data-testid="vertical-resizer"
    >
      <div className="VerticalResizer--gripIcon" style={gripStyle} data-testid="grip-icon" />
      <div
        aria-hidden
        className="VerticalResizer--dragger"
        onMouseDown={dragManager.handleMouseDown}
        style={draggerStyle}
        data-testid="dragger"
      />
    </div>
  );
};

export default VerticalResizer;
