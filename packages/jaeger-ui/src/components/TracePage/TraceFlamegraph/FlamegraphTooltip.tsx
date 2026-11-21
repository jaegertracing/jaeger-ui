// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import { formatDuration } from '../../../utils/date';
import { Microseconds } from '../../../types/units';

export const TOOLTIP_CURSOR_OFFSET_PX = 10;

type Props = {
  x: number;
  y: number;
  name: string;
  value: number;
  count: number;
  rootValue: number;
  ref?: React.Ref<HTMLDivElement>;
};

const FlamegraphTooltip = ({ x, y, name, value, count, rootValue, ref }: Props) => {
  const pct = rootValue > 0 ? ((value / rootValue) * 100).toFixed(2) : '0';
  const dur = formatDuration(value as Microseconds);

  return (
    <div
      ref={ref}
      className="Flamegraph-tooltip"
      style={{ left: x + TOOLTIP_CURSOR_OFFSET_PX, top: y + TOOLTIP_CURSOR_OFFSET_PX }}
    >
      <div className="Flamegraph-tooltip--title">{name}</div>
      <table className="Flamegraph-tooltip--table">
        <tbody>
          <tr>
            <td>% of time:</td>
            <td>{pct}%</td>
          </tr>
          <tr>
            <td>Duration:</td>
            <td>{dur}</td>
          </tr>
          {count > 1 && (
            <tr>
              <td>Spans:</td>
              <td>{count}</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="Flamegraph-tooltip--hint">Right click for more node viewing options</div>
    </div>
  );
};

export default FlamegraphTooltip;
