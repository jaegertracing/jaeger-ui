// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { useLocation, useNavigate } from 'react-router-dom';
import queryString from 'query-string';

import { actions } from './duck';
import ServiceFilter from './ServiceFilter';
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
import VirtualizedTraceView from './VirtualizedTraceView';
import VerticalResizer from '../../common/VerticalResizer';
import { merge as mergeShortcuts } from '../keyboard-shortcuts';
import { Accessors } from '../ScrollManager';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate } from '../types';
import { TNil, ReduxState } from '../../../types';
import { IOtelSpan, IOtelTrace } from '../../../types/otel';
import { CriticalPathSection } from '../../../types/critical_path';
import { decodeSvcFilter, encodeSvcFilter, getSortedServiceNames } from '../url/svcFilter';

import './index.css';

type TDispatchProps = {
  // These Redux dispatchers are kept for the tracking middleware only.
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
    setSpanNameColumnWidth: reduxSetSpanNameColumnWidth,
    setSidePanelWidth: reduxSetSidePanelWidth,
    updateNextViewRangeTime,
    updateViewRangeTime,
    viewRange,
    trace,
    useOtelTerms,
    ...rest
  } = props;

  // Layout preferences are owned by Zustand; Redux setters are also called for the tracking middleware.
  const detailPanelMode = useLayoutPrefsStore(s => s.detailPanelMode);
  const sidePanelWidth = useLayoutPrefsStore(s => s.sidePanelWidth);
  const spanNameColumnWidth = useLayoutPrefsStore(s => s.spanNameColumnWidth);
  const timelineBarsVisible = useLayoutPrefsStore(s => s.timelineBarsVisible);
  const zustandSetSpanNameColumnWidth = useLayoutPrefsStore(s => s.setSpanNameColumnWidth);
  const zustandSetSidePanelWidth = useLayoutPrefsStore(s => s.setSidePanelWidth);

  const detailStates = useTraceTimelineStore(s => s.detailStates);
  const prunedServices = useTraceTimelineStore(s => s.prunedServices);
  const zustandSetPrunedServices = useTraceTimelineStore(s => s.setPrunedServices);
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

  // Side panel is permanently visible whenever side panel mode is active.
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

  // --- Service filter: URL sync ---
  const location = useLocation();
  const navigate = useNavigate();
  const sortedServiceNames = useMemo(() => getSortedServiceNames(trace.services), [trace.services]);

  // On mount (or trace change): read svcFilter from URL, fall back to localStorage defaults.
  useEffect(() => {
    const params = queryString.parse(location.search);
    const svcFilterParam = typeof params.svcFilter === 'string' ? params.svcFilter : null;
    if (svcFilterParam) {
      const decoded = decodeSvcFilter(sortedServiceNames, svcFilterParam);
      if (decoded && !decoded.stale) {
        const allServices = new Set(sortedServiceNames);
        const pruned = new Set<string>();
        for (const name of allServices) {
          if (!decoded.visibleServices.has(name)) pruned.add(name);
        }
        zustandSetPrunedServices(pruned);
        return;
      }
      // Stale or invalid: clear the URL param.
      const nextParams = { ...params };
      delete nextParams.svcFilter;
      const search = queryString.stringify(nextParams);
      navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
    }
    // No URL param: try localStorage defaults.
    try {
      const stored = localStorage.getItem('svcFilter.defaults');
      if (stored) {
        const defaults = JSON.parse(stored) as { prunedServices?: string[] };
        if (Array.isArray(defaults.prunedServices)) {
          const traceServiceSet = new Set(sortedServiceNames);
          const pruned = new Set(defaults.prunedServices.filter(name => traceServiceSet.has(name)));
          if (pruned.size > 0 && pruned.size < sortedServiceNames.length) {
            zustandSetPrunedServices(pruned);
            return;
          }
        }
      }
    } catch {
      // Ignore localStorage errors.
    }
    zustandSetPrunedServices(new Set());
    // Intentionally only re-run when the trace identity changes, not on URL/navigate changes.
    // oxlint-disable-next-line react-x/exhaustive-deps
  }, [trace.traceID]);

  const handleServiceFilterApply = useCallback(
    (nextPruned: Set<string>) => {
      zustandSetPrunedServices(nextPruned);

      // If the currently selected span (side panel) belongs to a pruned service, deselect it.
      if (nextPruned.size > 0 && detailPanelMode === 'sidepanel') {
        const currentDetailStates = useTraceTimelineStore.getState().detailStates;
        const currentSelectedID = getSelectedSpanID(currentDetailStates);
        if (currentSelectedID) {
          const selectedSpan = trace.spanMap.get(currentSelectedID);
          if (selectedSpan && nextPruned.has(selectedSpan.resource.serviceName)) {
            useTraceTimelineStore.setState({ detailStates: new Map() });
          }
        }
      }

      // Update URL.
      const params = queryString.parse(location.search);
      if (nextPruned.size === 0) {
        delete params.svcFilter;
      } else {
        const visible = new Set(sortedServiceNames.filter(name => !nextPruned.has(name)));
        const encoded = encodeSvcFilter(sortedServiceNames, visible);
        if (encoded) {
          params.svcFilter = encoded;
        } else {
          delete params.svcFilter;
        }
      }
      const search = queryString.stringify(params);
      navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
    },
    [
      zustandSetPrunedServices,
      detailPanelMode,
      trace.spanMap,
      location.pathname,
      location.search,
      sortedServiceNames,
      navigate,
    ]
  );

  const serviceFilterNode = useMemo(
    () => <ServiceFilter trace={trace} prunedServices={prunedServices} onApply={handleServiceFilterApply} />,
    [trace, prunedServices, handleServiceFilterApply]
  );

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
  const resizerMax = sidePanelActive ? mainFraction - MIN_TIMELINE_COLUMN_WIDTH : SPAN_NAME_COLUMN_WIDTH_MAX;

  // Column header label: "Trace Root" when showing the root span (explicit or fallback),
  // "Span Details" for any other selected span.
  const rootSpanID = trace.rootSpans[0]?.spanID;
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
      /* istanbul ignore next */
      if (!layoutRef.current) return;
      const { top } = layoutRef.current.getBoundingClientRect();
      const headerHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--timeline-header-row-height'),
        10
      );
      setPanelTop(top + window.scrollY + headerHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    // ResizeObserver catches layout shifts that window resize misses (e.g. slim-header toggle,
    // archive notifier appearing), which would change the layout container's document offset.
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
      prunedServices={prunedServices}
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

// selectedSpanID is now computed inside TraceTimelineViewerImpl from the Zustand store.
function mapStateToProps(_state: ReduxState) {
  return {};
}

function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { setSpanNameColumnWidth, setSidePanelWidth, expandAll, expandOne, collapseAll, collapseOne } =
    bindActionCreators(actions, dispatch);
  return { setSpanNameColumnWidth, setSidePanelWidth, expandAll, expandOne, collapseAll, collapseOne };
}

export default connect(mapStateToProps, mapDispatchToProps)(TraceTimelineViewerImpl);
