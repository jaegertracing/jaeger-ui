// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { actions } from './duck';
import TimelineHeaderRow from './TimelineHeaderRow';
import VirtualizedTraceView from './VirtualizedTraceView';
import { merge as mergeShortcuts } from '../keyboard-shortcuts';
import { Accessors } from '../ScrollManager';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate } from '../types';
import { TNil, ReduxState } from '../../../types';
import { Span, Trace } from '../../../types/trace';
import { CriticalPathSection } from '../../../types/critical_path';

import './index.css';

type TDispatchProps = {
  setSpanNameColumnWidth: (width: number) => void;
  collapseAll: (spans: ReadonlyArray<Span>) => void;
  collapseOne: (spans: ReadonlyArray<Span>) => void;
  expandAll: () => void;
  expandOne: (spans: ReadonlyArray<Span>) => void;
};

type TProps = TDispatchProps & {
  registerAccessors: (accessors: Accessors) => void;
  findMatchesIDs: Set<string> | TNil;
  scrollToFirstVisibleSpan: () => void;
  spanNameColumnWidth: number;
  trace: Trace;
  criticalPath: CriticalPathSection[];
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  viewRange: IViewRange;
  useOtelTerms: boolean;
};

const NUM_TICKS = 5;

/**
 * `TraceTimelineViewer` now renders the header row because it is sensitive to
 * `props.viewRange.time.cursor`. If `VirtualizedTraceView` renders it, it will
 * re-render the ListView every time the cursor is moved on the trace minimap
 * or `TimelineHeaderRow`.
 */

export const TraceTimelineViewerImpl = (props: TProps) => {
  const collapseAll = useCallback(() => {
    props.collapseAll(props.trace.spans);
  }, [props.collapseAll, props.trace.spans]);

  const collapseOne = useCallback(() => {
    props.collapseOne(props.trace.spans);
  }, [props.collapseOne, props.trace.spans]);

  const expandAll = useCallback(() => {
    props.expandAll();
  }, [props.expandAll]);

  const expandOne = useCallback(() => {
    props.expandOne(props.trace.spans);
  }, [props.expandOne, props.trace.spans]);

  useEffect(() => {
    mergeShortcuts({
      collapseAll,
      expandAll,
      collapseOne,
      expandOne,
    });
  }, [collapseAll, expandAll, collapseOne, expandOne]);

  const { setSpanNameColumnWidth, updateNextViewRangeTime, updateViewRangeTime, viewRange, ...rest } = props;
  const { spanNameColumnWidth, trace } = rest;

  return (
    <div className="TraceTimelineViewer">
      <TimelineHeaderRow
        duration={trace.duration}
        nameColumnWidth={spanNameColumnWidth}
        numTicks={NUM_TICKS}
        onCollapseAll={collapseAll}
        onCollapseOne={collapseOne}
        onColummWidthChange={setSpanNameColumnWidth}
        onExpandAll={expandAll}
        onExpandOne={expandOne}
        viewRangeTime={viewRange.time}
        updateNextViewRangeTime={updateNextViewRangeTime}
        updateViewRangeTime={updateViewRangeTime}
      />
      <VirtualizedTraceView {...rest} currentViewRangeTime={viewRange.time.current} />
    </div>
  );
};

function mapStateToProps(state: ReduxState) {
  const spanNameColumnWidth = state.traceTimeline.spanNameColumnWidth;
  return { spanNameColumnWidth };
}

function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { setSpanNameColumnWidth, expandAll, expandOne, collapseAll, collapseOne } = bindActionCreators(
    actions,
    dispatch
  );
  return { setSpanNameColumnWidth, expandAll, expandOne, collapseAll, collapseOne };
}

export default connect(mapStateToProps, mapDispatchToProps)(TraceTimelineViewerImpl);
