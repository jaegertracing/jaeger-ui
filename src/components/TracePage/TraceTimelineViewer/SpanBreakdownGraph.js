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

import PropTypes from 'prop-types';
import React from 'react';
import SpanGraphTick from '../../SpanGraph/SpanGraphTick';
import logPropTypes from '../../../propTypes/log';

export default function SpanBreakdownBar({ span }) {
  const padding = 3;
  const fontSize = 11;
  return (
    <div className="span-breakdown-graph">
      <div
        style={{
          border: '1px solid rgba(34,36,38,.15)',
          width: '100%',
          height: 20,
          backgroundColor: '#F1F1F1',
        }}
      >
        <span
          className="span-breakdown-graph--start-time"
          style={{
            fontSize,
            float: 'left',
            paddingLeft: padding,
          }}
        >
          0 ms
        </span>
        <span
          className="span-breakdown-graph--end-time"
          style={{
            fontSize,
            float: 'right',
            paddingRight: padding,
          }}
        >
          {span.duration} ms
        </span>
      </div>
      <svg
        style={{
          width: '100%',
          height: 50,
          backgroundColor: 'rgba(0, 0 , 50, 0.02)',
        }}
      >
        {span.logs.map((log, i) =>
          <SpanGraphTick
            key={i}
            color={log.color}
            initialTimestamp={0}
            tick={{ timestamp: log.relativeTime, width: 2 }}
            totalDuration={span.duration}
          />
        )}
      </svg>
    </div>
  );
}

SpanBreakdownBar.propTypes = {
  span: PropTypes.shape({
    duration: PropTypes.number,
    timestamp: PropTypes.number,
    logs: PropTypes.arrayOf(logPropTypes),
  }),
};
