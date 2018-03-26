// @flow

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

import React from 'react';
import { connect } from 'react-redux';

import { actions } from './duck';
import TimelineHeaderRow from './TimelineHeaderRow';
import VirtualizedTraceView from './VirtualizedTraceView';
import type { Accessors } from '../ScrollManager';
import type { ViewRange, ViewRangeTimeUpdate } from '../types';
import type { Trace } from '../../../types';

import './index.css';

type TraceTimelineViewerProps = {
  registerAccessors: Accessors => void,
  setSpanNameColumnWidth: number => void,
  spanNameColumnWidth: number,
  textFilter: ?string,
  trace: Trace,
  updateNextViewRangeTime: ViewRangeTimeUpdate => void,
  updateViewRangeTime: (number, number, ?string) => void,
  viewRange: ViewRange,
};

const NUM_TICKS = 5;

/**
 * `TraceTimelineViewer` now renders the header row because it is sensitive to
 * `props.viewRange.time.cursor`. If `VirtualizedTraceView` renders it, it will
 * re-render the ListView every time the cursor is moved on the trace minimap
 * or `TimelineHeaderRow`.
 */
function TraceTimelineViewer(props: TraceTimelineViewerProps) {
  const { setSpanNameColumnWidth, updateNextViewRangeTime, updateViewRangeTime, viewRange, ...rest } = props;
  const { spanNameColumnWidth, trace } = rest;
  return (
    <div className="TraceTimelineViewer">
      <TimelineHeaderRow
        duration={trace.duration}
        nameColumnWidth={spanNameColumnWidth}
        numTicks={NUM_TICKS}
        onColummWidthChange={setSpanNameColumnWidth}
        viewRangeTime={viewRange.time}
        updateNextViewRangeTime={updateNextViewRangeTime}
        updateViewRangeTime={updateViewRangeTime}
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
