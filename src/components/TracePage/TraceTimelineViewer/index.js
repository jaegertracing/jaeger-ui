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
import React, { Component } from 'react';

import VirtualizedTraceView from './VirtualizedTraceView';
import { getPositionInRange } from './utils';

import './grid.css';
import './index.css';

export default class TraceTimelineViewer extends Component {
  componentWillReceiveProps(nextProps) {
    const { trace } = nextProps;
    if (trace !== this.props.trace) {
      throw new Error('Component does not support changing the trace');
    }
  }

  render() {
    const { timeRangeFilter: zoomRange, textFilter, trace } = this.props;
    const { startTime, endTime } = trace;
    return (
      <div className="trace-timeline-viewer">
        <VirtualizedTraceView
          textFilter={textFilter}
          trace={trace}
          zoomStart={getPositionInRange(startTime, endTime, zoomRange[0])}
          zoomEnd={getPositionInRange(startTime, endTime, zoomRange[1])}
        />
      </div>
    );
  }
}
TraceTimelineViewer.propTypes = {
  trace: PropTypes.object,
  timeRangeFilter: PropTypes.array,
  textFilter: PropTypes.string,
};
