// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { actions, SIDE_PANEL_WIDTH_MAX, SIDE_PANEL_WIDTH_MIN } from './duck';
import SpanDetailSidePanel from './SpanDetailSidePanel';
import TimelineHeaderRow from './TimelineHeaderRow';
import VirtualizedTraceView from './VirtualizedTraceView';
import VerticalResizer from '../../common/VerticalResizer';
import { merge as mergeShortcuts } from '../keyboard-shortcuts';
import { Accessors } from '../ScrollManager';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate } from '../types';
import { TNil, ReduxState } from '../../../types';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';
import { CriticalPathSection } from '../../../types/critical_path';

import './index.css';

type TDispatchProps = {
  setSpanNameColumnWidth: (width: number) => void;
  setSidePanelWidth: (width: number) => void;
  collapseAll: (spans: ReadonlyArray<IOtelSpan>) => void;
  collapseOne: (spans: ReadonlyArray<IOtelSpan>) => void;
  expandAll: () => void;
  expandOne: (spans: ReadonlyArray<IOtelSpan>) => void;
};

type TProps = TDispatchProps & {
  registerAccessors: (accessors: Accessors) => void;
  findMatchesIDs: Set<string> | TNil;
  scrollToFirstVisibleSpan: () => void;
  detailPanelMode: 'inline' | 'sidepanel';
  sidePanelWidth: number;
  spanNameColumnWidth: number;
  timelineBarsVisible: boolean;
  selectedSpanID: string | null;
  trace: IOtelTrace;
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
  const {
    collapseAll: collapseAllAction,
    collapseOne: collapseOneAction,
    expandAll: expandAllAction,
    expandOne: expandOneAction,
    setSpanNameColumnWidth,
    setSidePanelWidth,
    updateNextViewRangeTime,
    updateViewRangeTime,
    viewRange,
    trace,
    detailPanelMode,
    sidePanelWidth,
    spanNameColumnWidth,
    timelineBarsVisible,
    selectedSpanID,
    useOtelTerms,
    ...rest
  } = props;

  // Side panel is permanently visible whenever side panel mode is active.
  const sidePanelActive = detailPanelMode === 'sidepanel';

  const collapseAll = useCallback(() => {
    collapseAllAction(trace.spans);
  }, [collapseAllAction, trace.spans]);

  const collapseOne = useCallback(() => {
    collapseOneAction(trace.spans);
  }, [collapseOneAction, trace.spans]);

  const expandAll = useCallback(() => {
    expandAllAction();
  }, [expandAllAction]);

  const expandOne = useCallback(() => {
    expandOneAction(trace.spans);
  }, [expandOneAction, trace.spans]);

  useEffect(() => {
    mergeShortcuts({
      collapseAll,
      expandAll,
      collapseOne,
      expandOne,
    });
  }, [collapseAll, expandAll, collapseOne, expandOne]);

  // When timeline bars are hidden with the side panel active, the side panel expands to absorb
  // the timeline column so the Service/Operation column keeps its pixel width unchanged.
  const effectiveSidePanelWidth =
    sidePanelActive && !timelineBarsVisible ? 1 - spanNameColumnWidth : sidePanelWidth;

  // Column header label: "Trace Root" when showing the root span (explicit or fallback),
  // "Span Details" for any other selected span.
  const rootSpanID = trace.spans[0]?.spanID;
  const sidePanelLabel =
    selectedSpanID === null || selectedSpanID === rootSpanID ? 'Trace Root' : 'Span Details';

  // TimelineHeaderRow is position:fixed (see TimelineHeaderRow.css), so it takes no space in the
  // document flow. layoutRef is on the --sidePanelLayout div which starts at the same document
  // position as the header row. We compute panelTop once:
  //   top + scrollY = document-relative top of the layout area = the fixed viewport top of the header
  //   + 38          = the fixed header height, so the panel starts just below the header
  // Because the header is fixed, panelTop is constant — only a resize listener is needed.
  const layoutRef = useRef<HTMLDivElement>(null);
  const [panelTop, setPanelTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!sidePanelActive) return;
    const measure = () => {
      if (!layoutRef.current) return;
      const { top } = layoutRef.current.getBoundingClientRect();
      setPanelTop(top + window.scrollY + 38);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [sidePanelActive]);

  const headerRow = (
    <TimelineHeaderRow
      duration={trace.duration}
      nameColumnWidth={spanNameColumnWidth}
      numTicks={NUM_TICKS}
      onCollapseAll={collapseAll}
      onCollapseOne={collapseOne}
      onColummWidthChange={setSpanNameColumnWidth}
      onExpandAll={expandAll}
      onExpandOne={expandOne}
      sidePanelVisible={sidePanelActive}
      sidePanelWidth={effectiveSidePanelWidth}
      sidePanelLabel={sidePanelLabel}
      timelineBarsVisible={timelineBarsVisible}
      viewRangeTime={viewRange.time}
      updateNextViewRangeTime={updateNextViewRangeTime}
      updateViewRangeTime={updateViewRangeTime}
      useOtelTerms={useOtelTerms}
    />
  );

  const virtualizedView = (
    <VirtualizedTraceView
      {...rest}
      trace={trace}
      useOtelTerms={useOtelTerms}
      currentViewRangeTime={viewRange.time.current}
    />
  );

  if (sidePanelActive) {
    const mainWidth = (1 - effectiveSidePanelWidth) * 100;
    const sidePanelStyle: React.CSSProperties = {
      width: `${effectiveSidePanelWidth * 100}%`,
      ...(panelTop !== null && {
        top: panelTop,
        height: `calc(100vh - ${panelTop}px)`,
      }),
    };
    return (
      <div className="TraceTimelineViewer">
        {headerRow}
        <div className="TraceTimelineViewer--sidePanelLayout" ref={layoutRef}>
          <div className="TraceTimelineViewer--main" style={{ width: `${mainWidth}%` }}>
            {virtualizedView}
          </div>
          {timelineBarsVisible && (
            <VerticalResizer
              position={1 - sidePanelWidth}
              min={1 - SIDE_PANEL_WIDTH_MAX}
              max={1 - SIDE_PANEL_WIDTH_MIN}
              onChange={newPosition => setSidePanelWidth(1 - newPosition)}
            />
          )}
          <div className="TraceTimelineViewer--sidePanel" style={sidePanelStyle}>
            <SpanDetailSidePanel
              trace={trace}
              currentViewRangeTime={viewRange.time.current}
              useOtelTerms={useOtelTerms}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="TraceTimelineViewer">
      {headerRow}
      {virtualizedView}
    </div>
  );
};

function mapStateToProps(state: ReduxState) {
  const {
    detailPanelMode,
    sidePanelWidth,
    spanNameColumnWidth,
    timelineBarsVisible,
    detailStates = new Map(),
  } = state.traceTimeline;
  const selectedSpanID = detailStates.size > 0 ? (detailStates.keys().next().value as string) : null;
  return { detailPanelMode, sidePanelWidth, spanNameColumnWidth, timelineBarsVisible, selectedSpanID };
}

function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { setSpanNameColumnWidth, setSidePanelWidth, expandAll, expandOne, collapseAll, collapseOne } =
    bindActionCreators(actions, dispatch);
  return { setSpanNameColumnWidth, setSidePanelWidth, expandAll, expandOne, collapseAll, collapseOne };
}

export default connect(mapStateToProps, mapDispatchToProps)(TraceTimelineViewerImpl);
