// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState, useLayoutEffect } from 'react';
import dayjs from 'dayjs';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Label,
  Dot,
} from 'recharts';

import { FALLBACK_TRACE_NAME } from '../../../constants';
import { ONE_MILLISECOND, formatDuration } from '../../../utils/date';

import './ScatterPlot.css';
import { getTimeFormat } from '../../../utils/time-format';

export type TScatterPlotPoint = {
  x: number;
  y: number;
  traceID: string;
  size: number;
  name?: string;
  services?: ReadonlyArray<{
    name: string;
    numberOfSpans: number;
  }>;
  color?: string;
};

type TScatterPlotProps = {
  data: TScatterPlotPoint[];
  onValueClick: (value: any) => void;
  // JSDOM does not, as of 2023, have a layout engine,
  // so allow tests to supply a mock width as a workaround
  calculateContainerWidth?: (container: HTMLElement) => number;
};

export const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TScatterPlotPoint }[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const numServices = data.services ? data.services.length : 0;

    return (
      <div className="scatter-plot-hint">
        <h4>{data.name || FALLBACK_TRACE_NAME}</h4>
        <div className="scatter-plot-hint-stats">
          <div>
            <strong>Spans:</strong> {data.size}
          </div>
          <div>
            <strong>Services:</strong> {numServices}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const RenderDot = ({
  cx,
  cy,
  fill,
  size,
}: {
  cx?: number;
  cy?: number;
  fill?: string;
  size?: number;
}) => {
  const maxSize = Math.min(300, size || 0);
  return (
    <Dot cx={cx} cy={cy} fill={fill} fillOpacity={0.5} r={maxSize * 0.035} style={{ cursor: 'pointer' }} />
  );
};

export default function ScatterPlot({
  data,
  onValueClick,
  calculateContainerWidth = (container: HTMLElement) => container.clientWidth,
}: TScatterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    function updateContainerWidth() {
      if (containerRef.current) {
        setContainerWidth(calculateContainerWidth(containerRef.current));
      }
    }

    // Calculate the initial width on first render.
    updateContainerWidth();

    window.addEventListener('resize', updateContainerWidth);

    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);

  const xMin = Math.min(...data.map(d => d.x));
  const xMax = Math.max(...data.map(d => d.x));

  /*
  This function generates unique ticks for the x-axis.
  It ensures that the ticks are unique by checking if the label for a given tick value has already been used.
  If it has, the tick is not added to the list of ticks.
  */
  const generateUniqueTicks = (min: number, max: number, count: number) => {
    const step = (max - min) / (count - 1);
    const ticks = [];
    const seenLabels = new Set();

    for (let i = 0; i < count; i++) {
      const value = min + step * i;
      ticks.push(value);
    }

    return ticks.filter(tick => {
      const label = dayjs(tick / ONE_MILLISECOND).format('hh:mm:ss a');
      if (seenLabels.has(label)) {
        return false;
      }
      seenLabels.add(label);
      return true;
    });
  };

  return (
    <div className="TraceResultsScatterPlot" ref={containerRef} style={{ width: '100%', height: 200 }}>
      {containerWidth > 0 && (
        <ResponsiveContainer>
          <ScatterChart
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 10,
            }}
          >
            <XAxis
              type="number"
              dataKey="x"
              name="Time"
              domain={[xMin, xMax]}
              ticks={generateUniqueTicks(xMin, xMax, 10)}
              tickFormatter={t => dayjs(t / ONE_MILLISECOND).format(getTimeFormat(true))}
              tick={{ fontSize: 11, dy: 5 }}
              axisLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
              tickLine={{ stroke: '#e6e6e9', strokeWidth: 1 }}
              allowDecimals={false}
              interval="equidistantPreserveStart"
            >
              <Label
                value="Time"
                position="insideTopRight"
                offset={15}
                fontSize={11}
                style={{ textAnchor: 'start' }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              name="Duration"
              tickFormatter={t => formatDuration(t)}
              tick={{ fontSize: 11, dx: -5 }}
              axisLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
              tickLine={{ stroke: '#e6e6e9', strokeWidth: 1 }}
              tickCount={4}
              allowDecimals={false}
              domain={['auto', 'auto']}
            >
              <Label
                value="Duration"
                position="insideTopLeft"
                offset={0}
                fontSize={11}
                style={{ textAnchor: 'end' }}
                angle={-90}
              />
            </YAxis>
            <ZAxis dataKey="size" type="number" range={[1, 300]} />
            <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
            <Scatter
              data={data.map(point => {
                return {
                  ...point,
                  fill: point.color,
                };
              })}
              onClick={onValueClick}
              shape={<RenderDot />}
            />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
