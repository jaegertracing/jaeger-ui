// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import { formatDuration } from '../../../../utils/date';
import { Microseconds } from '../../../../types/units';

import './TickLabels.css';

type TickLabelsProps = {
  numTicks: number;
  duration: number;
};

export default function TickLabels(props: TickLabelsProps) {
  const { numTicks, duration } = props;

  const ticks = [];
  for (let i = 0; i < numTicks + 1; i++) {
    const portion = i / numTicks;
    const style = portion === 1 ? { right: '0%' } : { left: `${portion * 100}%` };
    ticks.push(
      <div key={portion} className="TickLabels--label" style={style} data-testid="tick">
        {formatDuration((duration * portion) as Microseconds)}
      </div>
    );
  }

  return <div className="TickLabels">{ticks}</div>;
}
