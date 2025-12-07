// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useMemo, useCallback } from 'react';

import DraggableManager, { DraggableBounds, DraggingUpdate } from '..';
import { TNil } from '../../../types';

import './RegionDemo.css';

type TUpdate = {
  regionCursor?: number | null;
  regionDragging?: [number, number] | null;
};

type RegionDemoProps = {
  regionCursor: number | TNil;
  regionDragging: [number, number] | TNil;
  updateState: (update: TUpdate) => void;
};

const RegionDemo: React.FC<RegionDemoProps> = ({ regionCursor, regionDragging, updateState }) => {
  const realmElmRef = useRef<HTMLDivElement | null>(null);

  const getDraggingBounds = useCallback((): DraggableBounds => {
    if (!realmElmRef.current) {
      throw new Error('invalid state: realmElmRef is not set');
    }
    const { left: clientXLeft, width } = realmElmRef.current.getBoundingClientRect();
    return {
      clientXLeft,
      width,
      maxValue: 1,
      minValue: 0,
    };
  }, []);

  const handleMouseMove = useCallback(
    ({ value }: DraggingUpdate) => {
      updateState({ regionCursor: value });
    },
    [updateState]
  );

  const handleMouseLeave = useCallback(() => {
    updateState({ regionCursor: null });
  }, [updateState]);

  const handleDragUpdate = useCallback(
    ({ value }: DraggingUpdate) => {
      let newRegionDragging: [number, number];
      if (regionDragging) {
        newRegionDragging = [regionDragging[0], value];
      } else {
        newRegionDragging = [value, value];
      }
      updateState({ regionDragging: newRegionDragging });
    },
    [regionDragging, updateState]
  );

  const handleDragEnd = useCallback(
    ({ value }: DraggingUpdate) => {
      updateState({ regionDragging: null, regionCursor: value });
    },
    [updateState]
  );

  const dragManager = useMemo(
    () =>
      new DraggableManager({
        getBounds: getDraggingBounds,
        onDragEnd: handleDragEnd,
        onDragMove: handleDragUpdate,
        onDragStart: handleDragUpdate,
        onMouseMove: handleMouseMove,
        onMouseLeave: handleMouseLeave,
      }),
    [getDraggingBounds, handleDragEnd, handleDragUpdate, handleMouseMove, handleMouseLeave]
  );

  let cursorElm;
  let regionElm;

  if (regionDragging) {
    const [a, b] = regionDragging;
    const [left, right] = a < b ? [a, 1 - b] : [b, 1 - a];
    const regionStyle = { left: `${left * 100}%`, right: `${right * 100}%` };
    regionElm = <div className="RegionDemo--region" style={regionStyle} />;
  } else if (regionCursor) {
    const cursorStyle = { left: `${regionCursor * 100}%` };
    cursorElm = <div className="RegionDemo--regionCursor" style={cursorStyle} />;
  }

  return (
    <div
      aria-hidden
      className="RegionDemo--realm"
      onMouseDown={dragManager.handleMouseDown}
      onMouseMove={dragManager.handleMouseMove}
      onMouseLeave={dragManager.handleMouseLeave}
      ref={realmElmRef}
    >
      {regionElm}
      {cursorElm}
    </div>
  );
};

export default RegionDemo;
