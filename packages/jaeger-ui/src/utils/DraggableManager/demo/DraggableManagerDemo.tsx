// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useCallback } from 'react';

import DividerDemo from './DividerDemo';
import RegionDemo from './RegionDemo';
import { TNil } from '../../../types';

import './DraggableManagerDemo.css';

export type DraggableManagerDemoState = {
  dividerPosition: number;
  regionCursor: number | TNil;
  regionDragging: [number, number] | TNil;
};

const DraggableManagerDemo: React.FC = () => {
  const [dividerPosition, setDividerPosition] = useState<number>(0.25);
  const [regionCursor, setRegionCursor] = useState<number | TNil>(null);
  const [regionDragging, setRegionDragging] = useState<[number, number] | TNil>(null);

  const updateState = useCallback((nextState: any) => {
    if ('dividerPosition' in nextState) {
      setDividerPosition(nextState.dividerPosition);
    }
    if ('regionCursor' in nextState) {
      setRegionCursor(nextState.regionCursor);
    }
    if ('regionDragging' in nextState) {
      setRegionDragging(nextState.regionDragging);
    }
  }, []);

  return (
    <div className="DraggableManagerDemo">
      <h1>DraggableManager demo</h1>
      <section className="DraggableManagerDemo--scenario">
        <h2>Dragging a Divider</h2>
        <p>Click and drag the gray divider in the colored area, below.</p>
        <p>Value: {dividerPosition.toFixed(3)}</p>
        <div className="DraggableManagerDemo--realm">
          <DividerDemo position={dividerPosition} updateState={updateState} />
        </div>
      </section>
      <section className="DraggableManagerDemo--scenario">
        <h2>Dragging a Sub-Region</h2>
        <p>Click and drag horizontally somewhere in the colored area, below.</p>
        <p>Value: {regionDragging && regionDragging.map(n => n.toFixed(3)).join(', ')}</p>
        <div className="DraggableManagerDemo--realm">
          <RegionDemo regionCursor={regionCursor} regionDragging={regionDragging} updateState={updateState} />
        </div>
      </section>
    </div>
  );
};

export default DraggableManagerDemo;
