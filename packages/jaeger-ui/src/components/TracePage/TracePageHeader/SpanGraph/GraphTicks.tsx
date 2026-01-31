// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import './GraphTicks.css';

type GraphTicksProps = {
  numTicks: number;
};

export default function GraphTicks(props: GraphTicksProps) {
  const { numTicks } = props;
  const ticks = [];
  // i starts at 1, limit is `i < numTicks` so the first and last ticks aren't drawn
  for (let i = 1; i < numTicks; i++) {
    const x = `${(i / numTicks) * 100}%`;
    ticks.push(<line className="GraphTick" x1={x} y1="0%" x2={x} y2="100%" key={i / numTicks} />);
  }

  return (
    <g data-test="ticks" aria-hidden="true">
      {ticks}
    </g>
  );
}
