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

import React, { useRef, useCallback, useMemo } from 'react';

import { DraggableBounds, DraggingUpdate } from '..';
import DraggableManager from '../DraggableManager';

import './DividerDemo.css';

type DividerDemoProps = {
  position: number;
  updateState: (update: { dividerPosition: number }) => void;
};

const DividerDemo: React.FC<DividerDemoProps> = ({ position, updateState }) => {
  const realmElmRef = useRef<HTMLDivElement | null>(null);

  const getDraggingBounds = useCallback((): DraggableBounds => {
    if (!realmElmRef.current) {
      throw new Error('invalid state');
    }
    const { left: clientXLeft, width } = realmElmRef.current.getBoundingClientRect();
    return {
      clientXLeft,
      width,
      maxValue: 0.98,
      minValue: 0.02,
    };
  }, []);

  const handleDragEvent = useCallback(
    ({ value }: DraggingUpdate) => {
      updateState({ dividerPosition: value });
    },
    [updateState]
  );

  const dragManager = useMemo(
    () =>
      new DraggableManager({
        getBounds: getDraggingBounds,
        onDragEnd: handleDragEvent,
        onDragMove: handleDragEvent,
        onDragStart: handleDragEvent,
      }),
    [getDraggingBounds, handleDragEvent]
  );

  const style = { left: `${position * 100}%` };

  return (
    <div className="DividerDemo--realm" ref={realmElmRef}>
      <div
        aria-hidden
        className="DividerDemo--divider"
        onMouseDown={dragManager.handleMouseDown}
        style={style}
      />
    </div>
  );
};

export default DividerDemo;
