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

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

export default function VerticalResizer(props: VerticalResizerProps) {
  const { max, min, onChange, position, rightSide } = props;
  const [dragPosition, setDragPosition] = useState<number | TNil>(null);
  const rootElmRef = useRef<HTMLDivElement | null>(null);

  const getDraggingBounds = useCallback((): DraggableBounds => {
    if (!rootElmRef.current) {
      throw new Error('invalid state');
    }
    const { left: clientXLeft, width } = rootElmRef.current.getBoundingClientRect();
    const bounds = {
      clientXLeft,
      width,
      maxValue: rightSide ? 1 - min : max,
      minValue: rightSide ? 1 - max : min,
    };
    return bounds;
  }, [max, min, rightSide]);

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
      const newPosition = rightSide ? 1 - value : value;
      onChange(newPosition);
    },
    [onChange, rightSide]
  );

  const dragManagerRef = useRef(
    new DraggableManager({
      getBounds: getDraggingBounds,
      onDragEnd: handleDragEnd,
      onDragMove: handleDragUpdate,
      onDragStart: handleDragUpdate,
    })
  );

  useEffect(() => {
    return () => {
      dragManagerRef.current.dispose();
    };
  }, []);

  const isDragging = dragManagerRef.current.isDragging();
  const isDraggingCls = cx({
    isDraggingLeft: isDragging && dragPosition != null && dragPosition < position,
    isDraggingRight: isDragging && dragPosition != null && dragPosition > position,
  });

  const gripStyle = { left: `${position * 100}%` };
  const draggerStyle =
    isDragging && dragPosition != null
      ? {
          left: `${Math.min(position, dragPosition) * 100}%`,
          right: `calc(${(1 - Math.max(position, dragPosition)) * 100}% - 1px)`,
        }
      : gripStyle;

  return (
    <div className={`VerticalResizer ${isDraggingCls} ${rightSide ? 'is-flipped' : ''}`} ref={rootElmRef}>
      <div className="VerticalResizer--gripIcon" style={gripStyle} />
      <div
        aria-hidden
        className="VerticalResizer--dragger"
        onMouseDown={dragManagerRef.current.handleMouseDown}
        style={draggerStyle}
      />
    </div>
  );
}