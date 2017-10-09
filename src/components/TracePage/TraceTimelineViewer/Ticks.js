// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as React from 'react';

import { formatDuration } from './utils';

import './Ticks.css';

type TicksProps = {
  endTime?: number,
  numTicks: number,
  showLabels?: boolean,
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
        className="span-row-tick"
        style={{
          left: `${portion * 100}%`,
        }}
      >
        {labels &&
          <span className={`span-row-tick-label ${portion >= 1 ? 'is-end-anchor' : ''}`}>
            {labels[i]}
          </span>}
      </div>
    );
  }
  return (
    <div className="le-ticks">
      {ticks}
    </div>
  );
}
