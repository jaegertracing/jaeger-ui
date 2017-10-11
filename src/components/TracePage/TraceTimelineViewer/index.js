// @flow

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

import React from 'react';
import { connect } from 'react-redux';

import { actions } from './duck';
import TimelineHeaderRow from './TimelineHeaderRow';
import VirtualizedTraceView from './VirtualizedTraceView';
import type { Accessors } from '../ScrollManager';
import type { ViewRange, ViewRangeTimeUpdate } from '../types';
import type { Trace } from '../../../types';

import './grid.css';
import './index.css';

type TraceTimelineViewerProps = {
  registerAccessors: Accessors => void,
  setSpanNameColumnWidth: number => void,
  spanNameColumnWidth: number,
  textFilter: ?string,
  trace: Trace,
  updateNextViewRangeTime: ViewRangeTimeUpdate => void,
  updateViewRange: (number, number) => void,
  viewRange: ViewRange,
};

const NUM_TICKS = 5;

function TraceTimelineViewer(props: TraceTimelineViewerProps) {
  const { setSpanNameColumnWidth, updateNextViewRangeTime, updateViewRange, viewRange, ...rest } = props;
  const { spanNameColumnWidth, trace } = rest;
  return (
    <div className="trace-timeline-viewer">
      <TimelineHeaderRow
        duration={trace.duration}
        nameColumnWidth={spanNameColumnWidth}
        numTicks={NUM_TICKS}
        onColummWidthChange={setSpanNameColumnWidth}
        viewRangeTime={viewRange.time}
        updateNextViewRangeTime={updateNextViewRangeTime}
        updateViewRange={updateViewRange}
      />
      <VirtualizedTraceView {...rest} currentViewRangeTime={viewRange.time.current} />
    </div>
  );
}

function mapStateToProps(state, ownProps) {
  const spanNameColumnWidth = state.traceTimeline.spanNameColumnWidth;
  return { spanNameColumnWidth, ...ownProps };
}

function mapDispatchToProps(dispatch) {
  const setSpanNameColumnWidth = (...args) => {
    const action = actions.setSpanNameColumnWidth(...args);
    return dispatch(action);
  };
  return { setSpanNameColumnWidth };
}

export default connect(mapStateToProps, mapDispatchToProps)(TraceTimelineViewer);
