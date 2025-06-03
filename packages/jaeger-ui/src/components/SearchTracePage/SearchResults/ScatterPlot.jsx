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

import React, { useRef, useState, useLayoutEffect } from 'react';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
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

export const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="scatter-plot-hint">
        <h4>{payload[0].payload.name || FALLBACK_TRACE_NAME}</h4>
      </div>
    );
  }
  return null;
};

export const RenderDot = ({ cx, cy, fill, size }) => {
  const maxSize = Math.min(300, size);
  return (
    <Dot cx={cx} cy={cy} fill={fill} fillOpacity={0.5} r={maxSize * 0.035} style={{ cursor: 'pointer' }} />
  );
};

export default function ScatterPlot({
  data,
  onValueClick,
  // JSDOM does not, as of 2023, have a layout engine,
  // so allow tests to supply a mock width as a workaround
  calculateContainerWidth = container => container.clientWidth,
}) {
  const containerRef = useRef(null);
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
  const generateUniqueTicks = (min, max, count) => {
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
              tickFormatter={t => dayjs(t / ONE_MILLISECOND).format('hh:mm:ss a')}
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

const valueShape = PropTypes.shape({
  x: PropTypes.number,
  y: PropTypes.number,
  traceID: PropTypes.string,
  size: PropTypes.number,
  name: PropTypes.string,
});

ScatterPlot.propTypes = {
  data: PropTypes.arrayOf(valueShape).isRequired,
  onValueClick: PropTypes.func.isRequired,
  calculateContainerWidth: PropTypes.func,
};
