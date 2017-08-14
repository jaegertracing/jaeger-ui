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

import TimelineRow from './TimelineRow';
import SpanTreeOffset from './SpanTreeOffset';
import SpanDetail from './SpanDetail';

// import './SpanDetailRow.css';

export default function SpanDetailRow(props) {
  const { span, color, trace, toggleDetailExpansion } = props;
  return (
    <TimelineRow className="detail-row">
      <TimelineRow.Left>
        <div style={{ position: 'absolute', height: '100%' }}>
          <SpanTreeOffset level={span.depth + 1} />
          <span>
            <span
              className="span-name-expanded-accent"
              onClick={toggleDetailExpansion}
              style={{ borderColor: color }}
            />
          </span>
        </div>
      </TimelineRow.Left>
      <TimelineRow.Right>
        <div
          className="p2"
          style={{
            backgroundColor: 'whitesmoke',
            border: '1px solid lightgray',
            borderTop: `3px solid ${color}`,
            borderLeftColor: '#bbb',
            boxShadow: `inset 0 16px 20px -20px rgba(0,0,0,0.45),
              inset 0 -12px 20px -20px rgba(0,0,0,0.45)`,
          }}
        >
          <SpanDetail span={span} trace={trace} />
        </div>
      </TimelineRow.Right>
    </TimelineRow>
  );
}

SpanDetailRow.propTypes = {
  span: PropTypes.object,
  color: PropTypes.string,
};
