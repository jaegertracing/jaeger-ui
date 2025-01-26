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
import { ScatterChart, XAxis, YAxis, ZAxis, Scatter, Tooltip, ResponsiveContainer, Cell, Label } from 'recharts';

import { FALLBACK_TRACE_NAME } from '../../../constants';
import { ONE_MILLISECOND, formatDuration } from '../../../utils/date';

import './ScatterPlot.css';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return <h4 className="scatter-plot-hint">{payload[0].payload.name || FALLBACK_TRACE_NAME}</h4>;
  }
};

export default function ScatterPlot(props) {
  const { data, onValueClick, calculateContainerWidth = container => container.clientWidth } = props;

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

  function generateTicks() {
    const start = data[data.length - 1].x;
    const end = data[0].x;

    const step = (end - start) / 3; // Divide range into 3 equal steps
    return [start, start + step, start + 2 * step, end];
  }

  return (
    <div className="TraceResultsScatterPlot" ref={containerRef}>
      {containerWidth && (
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart width={containerWidth} margin={{ bottom: 20, left: 10, right: 30 }}>
            <Scatter
              data={data}
              fillOpacity={0.5}
              onClick={onValueClick}
            >
              {data.map(entry => (
                <Cell key={`cell-${entry.traceID}`} fill={entry.color} style={{ cursor: "pointer" }} />
              ))}
            </Scatter>

            <XAxis
              dataKey="x"
              reversed
              tickFormatter={t => dayjs(t / ONE_MILLISECOND).format('hh:mm:ss a')}
              fontSize="11px"
              tickLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
              axisLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
              scale="time"
              ticks={generateTicks()}
              interval={0}
              allowDataOverflow={true}
            >
              <Label value="Time" fontSize="11px" position="bottom" />
            </XAxis>
            <YAxis
              dataKey="y"
              tickFormatter={t => formatDuration(t)}
              fontSize="11px"
              tickLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
              axisLine={{ stroke: '#e6e6e9', strokeWidth: 2 }}
            >
              <Label value="Trace Duration" angle={-90} fontSize="11px" position="insideLeft" offset={0} style={{ textAnchor: 'middle' }} />
            </YAxis>

            <ZAxis dataKey="size" type="number" range={[90, 300]} />
            <Tooltip
              isAnimationActive={false}
              cursor={false}
              content={<CustomTooltip />}
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
