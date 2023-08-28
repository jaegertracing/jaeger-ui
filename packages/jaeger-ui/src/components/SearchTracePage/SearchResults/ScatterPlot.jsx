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
import moment from 'moment';
import PropTypes from 'prop-types';
import { ScatterChart, XAxis, YAxis, ZAxis, Scatter, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { FALLBACK_TRACE_NAME } from '../../../constants';
import { ONE_MILLISECOND, formatDuration } from '../../../utils/date';

import './ScatterPlot.css';

const CustomTooltip = ({ overValue }) => {
  if (overValue) {
    return <h4 className="scatter-plot-hint">{overValue.current?.name || FALLBACK_TRACE_NAME}</h4>;
  }
  return null;
};

export default function ScatterPlot(props) {
  const { data, onValueClick, calculateContainerWidth } = props;

  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const overValue = useRef();

  const onValueOver = value => {
    overValue.current = value;
  };

  const onValueOut = () => {
    overValue.current = null;
  };

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

  return (
    <div className="TraceResultsScatterPlot" ref={containerRef}>
      {containerWidth && (
        <ResponsiveContainer width={containerWidth} height={200}>
          <ScatterChart>
            <XAxis
              label={{ value: 'Time', position: 'insideRight' }}
              dataKey="x"
              reversed
              minTickGap={150}
              tickFormatter={t => moment(t / ONE_MILLISECOND).format('hh:mm:ss a')}
            />
            <YAxis
              label={{ value: 'Duration', angle: -90, position: 'insideLeft' }}
              dataKey="y"
              type="number"
              tickCount={3}
              tickFormatter={t => formatDuration(t)}
            />
            <ZAxis dataKey="size" type="number" range={[90, 300]} />
            <Scatter
              data={data}
              onClick={onValueClick}
              onMouseOver={onValueOver}
              onMouseOut={onValueOut}
              fillOpacity={0.5}
            >
              {data.map(entry => (
                <Cell key={`cell-${entry.traceID}`} fill={entry.color} />
              ))}
            </Scatter>
            <Tooltip cursor={false} content={<CustomTooltip overValue={overValue} />} />
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
  color: PropTypes.string,
});

ScatterPlot.propTypes = {
  data: PropTypes.arrayOf(valueShape).isRequired,
  onValueClick: PropTypes.func.isRequired,
  calculateContainerWidth: PropTypes.func,
};

ScatterPlot.defaultProps = {
  // JSDOM does not, as of 2023, have a layout engine, so allow tests to supply a mock width as a workaround.
  calculateContainerWidth: container => container.clientWidth,
};
