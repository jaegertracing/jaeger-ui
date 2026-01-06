// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import { formatDuration } from '../../../utils/date';
import { TNil } from '../../../types';
import { IOtelSpan } from '../../../types/otel';

import './Ticks.css';

type TicksProps = {
  numTicks: number;
  showLabels?: boolean | TNil;
  startTime?: IOtelSpan['startTime'] | TNil;
  endTime?: IOtelSpan['endTime'] | TNil;
};

export default function Ticks({ endTime = null, numTicks, showLabels = null, startTime = null }: TicksProps) {
  let labels: undefined | string[];
  if (showLabels) {
    labels = [];
    const viewingDuration = (endTime || 0) - (startTime || 0);
    for (let i = 0; i < numTicks; i++) {
      const durationAtTick = (startTime || 0) + (i / (numTicks - 1)) * viewingDuration;
      labels.push(formatDuration(durationAtTick as IOtelSpan['duration']));
    }
  }
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i < numTicks; i++) {
    const portion = i / (numTicks - 1);
    ticks.push(
      <div
        key={portion}
        className="Ticks--tick"
        style={{
          left: `${portion * 100}%`,
        }}
      >
        {labels && (
          <span className={`Ticks--tickLabel ${portion >= 1 ? 'isEndAnchor' : ''}`}>{labels[i]}</span>
        )}
      </div>
    );
  }
  return <div className="Ticks">{ticks}</div>;
}
