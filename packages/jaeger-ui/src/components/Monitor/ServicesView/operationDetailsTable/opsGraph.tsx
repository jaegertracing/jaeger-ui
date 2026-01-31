// Copyright (c) 2021 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { AreaChart, Area, YAxis } from 'recharts';
import { ApiError } from '../../../../types/api-error';
import { Points } from '../../../../types/metrics';

type yDomain = [number, number];

type TProps = {
  color: string;
  dataPoints: Points[];
  yDomain?: yDomain;
  error: null | ApiError;
};

export const generatePlaceholder = (text: string) => <div className="ops-graph-placeholder">{text}</div>;

const OperationsGraph: React.FC<TProps> = ({ dataPoints, yDomain, color, error }) => {
  if (error) {
    return generatePlaceholder("Couldn't fetch data");
  }

  if (dataPoints.length === 0) {
    return generatePlaceholder('No Data');
  }

  const dynProps: {
    domain?: yDomain;
  } = {};

  if (yDomain) {
    dynProps.domain = yDomain;
  } else {
    const yValues = dataPoints.map(point => point.y).filter((y): y is number => y != null);
    if (yValues.length > 0) {
      const minY = Math.min(...yValues);
      const maxY = Math.max(...yValues);
      if (minY === maxY) {
        dynProps.domain = [minY * 0.8, minY * 2];
      } else {
        dynProps.domain = [minY * 0.99, maxY];
      }
    }
  }

  return (
    <div className="ops-container">
      <AreaChart
        width={100}
        height={15}
        margin={{
          left: 0,
          right: 0,
          bottom: 1,
          top: 0,
        }}
        data={dataPoints}
      >
        <YAxis hide {...dynProps} />
        <Area
          type="linear"
          dataKey="y"
          stroke={color}
          strokeWidth={1}
          fill={color}
          fillOpacity={1}
          isAnimationActive={false}
          connectNulls
          dot={false}
        />
      </AreaChart>
    </div>
  );
};

export default OperationsGraph;
