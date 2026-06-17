// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { actions } from './duck';
import {
  getSelectedSpanID,
  MIN_TIMELINE_COLUMN_WIDTH,
  SIDE_PANEL_WIDTH_MAX,
  SIDE_PANEL_WIDTH_MIN,
  SPAN_NAME_COLUMN_WIDTH_MAX,
  useLayoutPrefsStore,
  useTraceTimelineStore,
} from './store';
import SpanDetailSidePanel from './SpanDetailSidePanel';
import TimelineHeaderRow from './TimelineHeaderRow';
import { buildAvailableFields, buildSummaryLookup } from './summaryFieldsUtils';
import { useServiceFilter } from './useServiceFilter';
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
  trace: IOtelTrace;
  criticalPath: CriticalPathSection[];
  updateNextViewRangeTime: (update: ViewRangeTimeUpdate) => void;
  updateViewRangeTime: TUpdateViewRangeTimeFunction;
  viewRange: IViewRange;
  useOtelTerms: boolean;
};

const NUM_TICKS = 5;

export const TraceTimelineViewerImpl = (props: TProps) => {
  const {
    collapseAll: collapseAllAction,
    collapseOne: collapseOneAction,
    expandAll: expandAllAction,
    expandOne: expandOneAction,
    setSpanNameColumnWidth: reduxSetSpanNameColumnWidth,
    setSidePanelWidth: reduxSetSidePanelWidth,
    updateNextViewRangeTime,
    updateViewRangeTime,
    viewRange,
    trace,
    useOtelTerms,
    ...rest
  } = props;

  const detailPanelMode = useLayoutPrefsStore(s => s.detailPanelMode);
  const sidePanelWidth = useLayoutPrefsStore(s => s.sidePanelWidth);
  const spanNameColumnWidth = useLayoutPrefsStore(s => s.spanNameColumnWidth);
  const timelineBarsVisible = useLayoutPrefsStore(s => s.timelineBarsVisible);
  const zustandSetSpanNameColumnWidth = useLayoutPrefsStore(s => s.setSpanNameColumnWidth);
  const zustandSetSidePanelWidth = useLayoutPrefsStore(s => s.setSidePanelWidth);

  const detailStates = useTraceTimelineStore(s => s.detailStates);
  const selectedSpanID = detailPanelMode === 'sidepanel' ? getSelectedSpanID(detailStates) : null;
  const zustandCollapseAll = useTraceTimelineStore(s => s.collapseAll);
  const zustandCollapseOne = useTraceTimelineStore(s => s.collapseOne);
  const zustandExpandAll = useTraceTimelineStore(s => s.expandAll);
  const zustandExpandOne = useTraceTimelineStore(s => s.expandOne);

  const setSpanNameColumnWidth = useCallback(
    (width: number) => {
      zustandSetSpanNameColumnWidth(width);
      reduxSetSpanNameColumnWidth(width);
    },
    [zustandSetSpanNameColumnWidth, reduxSetSpanNameColumnWidth]
  );

  const setSidePanelWidth = useCallback(
    (width: number) => {
      zustandSetSidePanelWidth(width);
      reduxSetSidePanelWidth(width);
    },
    [zustandSetSidePanelWidth, reduxSetSidePanelWidth]
  );

  const sidePanelActive = detailPanelMode === 'sidepanel';

  const collapseAll = useCallback(() => {
    collapseAllAction(trace.spans);
    zustandCollapseAll(trace.spans);
  }, [collapseAllAction, trace.spans, zustandCollapseAll]);

  const collapseOne = useCallback(() => {
    collapseOneAction(trace.spans);
    zustandCollapseOne(trace.spans);
  }, [collapseOneAction, trace.spans, zustandCollapseOne]);

  const expandAll = useCallback(() => {
    expandAllAction();
    zustandExpandAll();
  }, [expandAllAction, zustandExpandAll]);

  const expandOne = useCallback(() => {
    expandOneAction(trace.spans);
    zustandExpandOne(trace.spans);
  }, [expandOneAction, trace.spans, zustandExpandOne]);

  useEffect(() => {
    mergeShortcuts({
      collapseAll,
      expandAll,
      collapseOne,
      expandOne,
    });
  }, [collapseAll, expandAll, collapseOne, expandOne]);

  const { serviceFilterNode } = useServiceFilter(trace, detailPanelMode);

  const selectedFields = useLayoutPrefsStore(s => s.selectedSummaryFields);
  const availableFieldKeys = useMemo(
    () => new Set(buildAvailableFields(trace).map(field => field.key)),
    [trace]
  );
  const effectiveSelectedFields = useMemo(
    () => selectedFields.filter(key => availableFieldKeys.has(key)),
    [availableFieldKeys, selectedFields]
  );
  const summaryLookup = useMemo(
    () => buildSummaryLookup(trace, effectiveSelectedFields),
    [trace, effectiveSelectedFields]
  );

  const effectiveSidePanelWidth =
    sidePanelActive && !timelineBarsVisible ? 1 - spanNameColumnWidth : sidePanelWidth;

  const panelFraction = sidePanelActive ? effectiveSidePanelWidth : 0;
  const mainFraction = 1 - panelFraction;
  const nameColumnWidth = timelineBarsVisible ? Math.min(spanNameColumnWidth / mainFraction, 1) : 1;
  const headerNameWidth = nameColumnWidth * mainFraction;
  const resizerMax = sidePanelActive ? mainFraction - MIN_TIMELINE_COLUMN_WIDTH : SPAN_NAME_COLUMN_WIDTH_MAX;

  const rootSpanID = trace.rootSpans[0]?.spanID;
  const sidePanelLabel =
    selectedSpanID === null || selectedSpanID === rootSpanID ? 'Trace Root' : 'Span Details';

  const layoutRef = useRef<HTMLDivElement>(null);
  const [panelTop, setPanelTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!sidePanelActive) return;
    const measure = () => {
      /* istanbul ignore next */
      if (!layoutRef.current) return;
      const { top } = layoutRef.current.getBoundingClientRect();
      const rootStyle = getComputedStyle(document.documentElement);
      const timelineHeaderHeight = parseInt(rootStyle.getPropertyValue('--timeline-header-row-height'), 10);
      setPanelTop(top + window.scrollY + timelineHeaderHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    /* istanbul ignore next */
    const resizeObserver = new ResizeObserver(measure);
    /* istanbul ignore next */
    if (layoutRef.current) resizeObserver.observe(layoutRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      /* istanbul ignore next */
      resizeObserver.disconnect();
    };
  }, [sidePanelActive]);

  const headerRow = (
    <TimelineHeaderRow
      duration={trace.duration}
      nameColumnWidth={headerNameWidth}
      numTicks={NUM_TICKS}
      onCollapseAll={collapseAll}
      onCollapseOne={collapseOne}
      onColummWidthChange={setSpanNameColumnWidth}
      onExpandAll={expandAll}
      onExpandOne={expandOne}
      resizerMax={resizerMax}
      serviceFilterNode={serviceFilterNode}
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
      nameColumnWidth={nameColumnWidth}
      selectedFields={effectiveSelectedFields}
      summaryLookup={summaryLookup}
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
              min={1 - Math.min(SIDE_PANEL_WIDTH_MAX, 1 - spanNameColumnWidth - MIN_TIMELINE_COLUMN_WIDTH)}
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

function mapStateToProps(_state: ReduxState) {
  return {};
}

function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { setSpanNameColumnWidth, setSidePanelWidth, expandAll, expandOne, collapseAll, collapseOne } =
    bindActionCreators(actions, dispatch);
  return { setSpanNameColumnWidth, setSidePanelWidth, expandAll, expandOne, collapseAll, collapseOne };
}

export default connect(mapStateToProps, mapDispatchToProps)(TraceTimelineViewerImpl);
