// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  getSelectedSpanID,
  MIN_TIMELINE_COLUMN_WIDTH,
  SIDE_PANEL_WIDTH_MIN,
  SPAN_NAME_COLUMN_WIDTH_MAX,
  SPAN_NAME_COLUMN_WIDTH_MIN,
  useLayoutPrefsStore,
  useTraceTimelineStore,
} from './store';
import {
  trackCollapseAll,
  trackCollapseOne,
  trackColumnWidth,
  trackExpandAll,
  trackExpandOne,
} from './store.track';
import SpanDetailSidePanel from './SpanDetailSidePanel';
import TimelineHeaderRow from './TimelineHeaderRow';
import { useServiceFilter } from './useServiceFilter';
import { useSpanPillsEnabled } from './spanPills';
import VirtualizedTraceView from './VirtualizedTraceView';
import { getFocusedSubtree } from './timeline-utils';
import { isSpanPruned } from './generateRowStates';
import { merge as mergeShortcuts } from '../keyboard-shortcuts';
import { Accessors } from '../ScrollManager';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate } from '../types';
import { TNil } from '../../../types';
import { IOtelTrace } from '../../../types/otel';
import { CriticalPathSection } from '../../../types/critical_path';

import './index.css';

type TProps = {
  registerAccessors: (accessors: Accessors) => void;
  findMatchesIDs: Set<string> | TNil;
  scrollToFirstVisibleSpan: () => void;
  // Height of the TracePage header, which pads this view down by that much. The side panel measures
  // its own document offset, so it has to know when that padding changes.
  pageHeaderHeight: number;
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
    updateNextViewRangeTime,
    updateViewRangeTime,
    viewRange,
    pageHeaderHeight,
    trace,
    useOtelTerms,
    ...rest
  } = props;

  // Layout preferences are owned by Zustand. Each handler tracks before it updates the store.
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
      trackColumnWidth(width);
      zustandSetSpanNameColumnWidth(width);
    },
    [zustandSetSpanNameColumnWidth]
  );

  const setSidePanelWidth = useCallback(
    (width: number) => {
      trackColumnWidth(width);
      zustandSetSidePanelWidth(width);
    },
    [zustandSetSidePanelWidth]
  );

  // Side panel is permanently visible whenever side panel mode is active.
  const sidePanelActive = detailPanelMode === 'sidepanel';

  const focusedSubtreeSpanID = useTraceTimelineStore(s => s.focusedSubtreeSpanID);
  const prunedServices = useTraceTimelineStore(s => s.prunedServices);

  const effectiveSpans = useMemo(() => {
    const subtree = getFocusedSubtree(trace, focusedSubtreeSpanID, prunedServices);
    const base = subtree ?? trace.spans;
    if (prunedServices.size === 0) {
      return base;
    }
    return base.filter(s => !isSpanPruned(s, prunedServices));
  }, [trace, focusedSubtreeSpanID, prunedServices]);

  const collapseAll = useCallback(() => {
    trackCollapseAll();
    zustandCollapseAll(effectiveSpans);
  }, [effectiveSpans, zustandCollapseAll]);

  const collapseOne = useCallback(() => {
    trackCollapseOne();
    zustandCollapseOne(effectiveSpans);
  }, [effectiveSpans, zustandCollapseOne]);

  const expandAll = useCallback(() => {
    trackExpandAll();
    zustandExpandAll(effectiveSpans);
  }, [effectiveSpans, zustandExpandAll]);

  const expandOne = useCallback(() => {
    trackExpandOne();
    zustandExpandOne(effectiveSpans);
  }, [effectiveSpans, zustandExpandOne]);

  useEffect(() => {
    mergeShortcuts({
      collapseAll,
      expandAll,
      collapseOne,
      expandOne,
    });
  }, [collapseAll, expandAll, collapseOne, expandOne]);

  const { serviceFilterNode } = useServiceFilter(trace, detailPanelMode);

  const spanPillsEnabled = useSpanPillsEnabled();

  // When timeline bars are hidden with the side panel active, the side panel expands to absorb
  // the timeline column so the Service/Operation column keeps its pixel width unchanged.
  const effectiveSidePanelWidth =
    sidePanelActive && !timelineBarsVisible ? 1 - spanNameColumnWidth : sidePanelWidth;

  // Fraction of the main (non-panel) content area occupied by the name column.
  // In side panel mode the --main container is narrowed; rescaling keeps the name column at its
  // stored pixel width. When timeline bars are hidden the name column fills everything (= 1).
  const panelFraction = sidePanelActive ? effectiveSidePanelWidth : 0;
  const mainFraction = 1 - panelFraction;
  const nameColumnWidth = timelineBarsVisible ? Math.min(spanNameColumnWidth / mainFraction, 1) : 1;
  // Page-fraction width of the name column header cell and resizer position.
  // Equals spanNameColumnWidth when bars are visible (the round-trip through mainFraction cancels).
  // When bars are hidden with no side panel, the name column spans the full page.
  const headerNameWidth = nameColumnWidth * mainFraction;
  let resizerMax: number;
  if (sidePanelActive && timelineBarsVisible) {
    resizerMax = mainFraction - MIN_TIMELINE_COLUMN_WIDTH;
  } else if (sidePanelActive && !timelineBarsVisible) {
    resizerMax = 1 - SIDE_PANEL_WIDTH_MIN;
  } else {
    resizerMax = SPAN_NAME_COLUMN_WIDTH_MAX;
  }
  resizerMax = Math.max(SPAN_NAME_COLUMN_WIDTH_MIN, Math.min(resizerMax, 1));

  // Column header label: "Trace Root" when showing the root span (explicit or fallback),
  // "Span Details" for any other selected span.
  const rootSpanID = trace.rootSpans[0]?.spanID;
  const sidePanelLabel =
    selectedSpanID === null || selectedSpanID === rootSpanID ? 'Trace Root' : 'Span Details';

  // TimelineHeaderRow is position:fixed (see TimelineHeaderRow.css), so it takes no space in the
  // document flow. layoutRef is on the --sidePanelLayout div, which therefore starts at the same
  // document position as the header row: top + scrollY is both the layout area's document offset
  // and the header row's viewport top. The side panel starts one header row below that.
  const layoutRef = useRef<HTMLDivElement>(null);
  const [layoutTop, setLayoutTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!sidePanelActive) return;
    const measure = () => {
      /* istanbul ignore next */
      if (!layoutRef.current) return;
      const { top } = layoutRef.current.getBoundingClientRect();
      setLayoutTop(top + window.scrollY);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
    };
    // pageHeaderHeight is a dependency because TracePage pads this view down by it, so a change
    // moves the layout container without resizing it. The header is taller in timeline view than in
    // the others, since only the timeline shows the minimap, and its height reaches TracePage's
    // state one commit after the view switches — too late for the measurement taken on mount.
  }, [sidePanelActive, pageHeaderHeight]);

  const headerRow = (
    <TimelineHeaderRow
      duration={trace.duration}
      nameColumnWidth={headerNameWidth}
      numTicks={NUM_TICKS}
      onCollapseAll={collapseAll}
      onCollapseOne={collapseOne}
      onColummWidthChange={setSpanNameColumnWidth}
      onSidePanelWidthChange={setSidePanelWidth}
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
      spanPillsEnabled={spanPillsEnabled}
    />
  );

  if (sidePanelActive) {
    const mainWidth = (1 - effectiveSidePanelWidth) * 100;
    // The header row height stays in CSS so that vars.css remains its only definition.
    const headerRowHeight = 'var(--timeline-header-row-height)';
    const sidePanelStyle: React.CSSProperties = {
      width: `${effectiveSidePanelWidth * 100}%`,
      ...(layoutTop !== null && {
        top: `calc(${layoutTop}px + ${headerRowHeight})`,
        height: `calc(100vh - ${layoutTop}px - ${headerRowHeight})`,
      }),
    };
    return (
      <div className="TraceTimelineViewer">
        {headerRow}
        <div className="TraceTimelineViewer--sidePanelLayout" ref={layoutRef}>
          <div className="TraceTimelineViewer--main" style={{ width: `${mainWidth}%` }}>
            {virtualizedView}
          </div>
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

// Keeps connect()'s shallow-prop render bailout now that no Redux props are injected.
export default React.memo(TraceTimelineViewerImpl);
