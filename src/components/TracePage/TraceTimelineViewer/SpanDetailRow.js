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

import './SpanDetailRow.css';

export default function SpanDetailRow(props) {
  const {
    color,
    detailExpansionToggle,
    detailState,
    isFilteredOut,
    logItemToggle,
    logsToggle,
    onMeasureChange,
    processToggle,
    span,
    tagsToggle,
    trace,
  } = props;
  return (
    <TimelineRow
      className={`detail-row ${isFilteredOut ? 'is-filtered-out' : ''}`}
      onMeasureChange={onMeasureChange}
    >
      <TimelineRow.Left>
        <div className="detail-row-name-column">
          <SpanTreeOffset level={span.depth + 1} />
          <span>
            <span
              className="detail-row-expanded-accent"
              onClick={detailExpansionToggle}
              style={{ borderColor: color }}
            />
          </span>
        </div>
      </TimelineRow.Left>
      <TimelineRow.Right>
        <div className="p2 detail-info-wrapper" style={{ borderTopColor: color }}>
          <SpanDetail
            detailState={detailState}
            logItemToggle={logItemToggle}
            logsToggle={logsToggle}
            processToggle={processToggle}
            span={span}
            tagsToggle={tagsToggle}
            trace={trace}
          />
        </div>
      </TimelineRow.Right>
    </TimelineRow>
  );
}

SpanDetailRow.propTypes = {
  trace: PropTypes.object,
  span: PropTypes.object,
  color: PropTypes.string,
  isFilteredOut: PropTypes.bool,
  toggleDetailExpansion: PropTypes.func,
};
