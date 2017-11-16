// @flow

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

import * as React from 'react';

import { formatDuration } from './utils';

import './Ticks.css';

type TicksProps = {
  endTime?: ?number,
  numTicks: number,
  showLabels?: ?boolean,
  startTime?: ?number,
};

export default function Ticks(props: TicksProps) {
  const { endTime, numTicks, showLabels, startTime } = props;

  let labels: string[];
  if (showLabels) {
    labels = [];
    const viewingDuration = (endTime || 0) - (startTime || 0);
    for (let i = 0; i < numTicks; i++) {
      const durationAtTick = startTime + i / (numTicks - 1) * viewingDuration;
      labels.push(formatDuration(durationAtTick));
    }
  }
  const ticks: React.Node[] = [];
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

Ticks.defaultProps = {
  endTime: null,
  showLabels: null,
  startTime: null,
};
