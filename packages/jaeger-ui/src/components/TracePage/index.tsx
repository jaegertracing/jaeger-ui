// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InputRef } from 'antd';
import { useNormalizeTraceId } from './useNormalizeTraceId';
import { useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import _clamp from 'lodash/clamp';
import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import _memoize from 'lodash/memoize';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import ArchiveNotifier from './ArchiveNotifier';
import { useArchiveStore } from '../../stores/archive-store';
import { useEmbeddedState } from '../../stores/embedded-store';
import {
  setDetailPanelMode as setDetailPanelModeZustand,
  useLayoutPrefsStore,
  useTraceTimelineStore,
} from './TraceTimelineViewer/store';
import { trackFilter, trackFocusMatches, trackNextMatch, trackPrevMatch, trackRange } from './index.track';
import {
  CombokeysHandler,
  merge as mergeShortcuts,
  reset as resetShortcuts,
  ShortcutCallbacks,
} from './keyboard-shortcuts';
import { cancel as cancelScroll, scrollBy, scrollTo } from './scroll-page';
import ScrollManager from './ScrollManager';
import TraceGraph from './TraceGraph/TraceGraph';
import { trackSlimHeaderToggle } from './TracePageHeader/TracePageHeader.track';
import { useConfig } from '../../hooks/useConfig';
import TracePageHeader from './TracePageHeader';
import TraceTimelineViewer from './TraceTimelineViewer';
import { filterPrunedSpanIDs } from './TraceTimelineViewer/generateRowStates';
import { actions as timelineActions } from './TraceTimelineViewer/duck';
import {
  TUpdateViewRangeTimeFunction,
  IViewRange,
  ViewRangeTimeUpdate,
  ETraceViewType,
  viewTypeShowsMinimap,
} from './types';
import { getUrl } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { parseUiFind } from '../common/UiFindInput';
import { LocationState, ReduxState, TNil } from '../../types';
import { useTrace } from '../../hooks/useTraceLoading';
import { IOtelTrace } from '../../types/otel';
import filterSpans from '../../utils/filter-spans';
import updateUiFind from '../../utils/update-ui-find';
import TraceStatistics from './TraceStatistics/index';
import TraceSpanView from './TraceSpanView/index';
import TraceFlamegraph from './TraceFlamegraph/index';
import TraceLogsView from './TraceLogsView/index';
import type { BackendCapabilities, SpanDetailPanelMode, TraceGraphConfig } from '../../types/config';

import './index.css';
import memoizedTraceCriticalPath from './CriticalPath/index';
import withRouteProps from '../../utils/withRouteProps';

type TDispatchProps = {
  focusUiFindMatches: (trace: IOtelTrace, uiFind: string | TNil) => void;
  setDetailPanelMode: (mode: SpanDetailPanelMode) => void;
  setTimelineBarsVisible: (visible: boolean) => void;
};

type TOwnProps = {
  location: Location<LocationState>;
  params: { id: string };
  archiveEnabled: boolean;
  enableSidePanel: boolean;
  backendCapabilities: BackendCapabilities | TNil;
  criticalPathEnabled: boolean;
  disableJsonView: boolean;
  traceGraphConfig?: TraceGraphConfig;
  useOtelTerms: boolean;
};

type TReduxProps = {
  uiFind: string | TNil;
};

type TProps = TDispatchProps & TOwnProps & TReduxProps;

// export for tests
export const VIEW_MIN_RANGE = 0.01;
const VIEW_CHANGE_BASE = 0.005;
const VIEW_CHANGE_FAST = 0.05;

// export for tests
export function computeAdjustedRange(
  viewStart: number,
  viewEnd: number,
  startChange: number,
  endChange: number
): [number, number] {
  let start = _clamp(viewStart + startChange, 0, 0.99);
  let end = _clamp(viewEnd + endChange, 0.01, 1);
  if (end - start < VIEW_MIN_RANGE) {
    if (startChange < 0 && endChange < 0) {
      end = start + VIEW_MIN_RANGE;
    } else if (startChange > 0 && endChange > 0) {
      end = start + VIEW_MIN_RANGE;
    } else {
      const center = viewStart + (viewEnd - viewStart) / 2;
      start = center - VIEW_MIN_RANGE / 2;
      end = center + VIEW_MIN_RANGE / 2;
    }
  }
  return [start, end];
}

// export for tests
export const shortcutConfig: { [name: string]: [number, number] } = {
  panLeft: [-VIEW_CHANGE_BASE, -VIEW_CHANGE_BASE],
  panLeftFast: [-VIEW_CHANGE_FAST, -VIEW_CHANGE_FAST],
  panRight: [VIEW_CHANGE_BASE, VIEW_CHANGE_BASE],
  panRightFast: [VIEW_CHANGE_FAST, VIEW_CHANGE_FAST],
  zoomIn: [VIEW_CHANGE_BASE, -VIEW_CHANGE_BASE],
  zoomInFast: [VIEW_CHANGE_FAST, -VIEW_CHANGE_FAST],
  zoomOut: [-VIEW_CHANGE_BASE, VIEW_CHANGE_BASE],
  zoomOutFast: [-VIEW_CHANGE_FAST, VIEW_CHANGE_FAST],
};

// export for tests
export function makeShortcutCallbacks(adjRange: (start: number, end: number) => void): ShortcutCallbacks {
  function getHandler([startChange, endChange]: [number, number]): CombokeysHandler {
    return function combokeyHandler(event: React.KeyboardEvent<HTMLElement>) {
      event.preventDefault();
      adjRange(startChange, endChange);
    };
  }
  return _mapValues(shortcutConfig, getHandler);
}

// export for tests
export function TracePageImpl(props: TProps) {
  const embedded = useEmbeddedState();
  const {
    archiveEnabled,
    criticalPathEnabled,
    disableJsonView,
    enableSidePanel,
    focusUiFindMatches: focusUiFindMatchesProp,
    location,
    params,
    setDetailPanelMode: reduxSetDetailPanelMode,
    setTimelineBarsVisible: reduxSetTimelineBarsVisible,
    backendCapabilities,
    traceGraphConfig,
    uiFind,
    useOtelTerms,
  } = props;

  const id = params.id;
  const {
    data: traceData,
    isPending: traceLoading,
    isError: traceError,
    error: traceQueryError,
  } = useTrace(id);

  // Layout preferences are owned by Zustand; Redux setters are also called for the tracking middleware.
  const detailPanelMode = useLayoutPrefsStore(s => s.detailPanelMode);
  const timelineBarsVisible = useLayoutPrefsStore(s => s.timelineBarsVisible);
  const zustandSetTimelineBarsVisible = useLayoutPrefsStore(s => s.setTimelineBarsVisible);
  const zustandFocusUiFindMatches = useTraceTimelineStore(s => s.focusUiFindMatches);
  const prunedServices = useTraceTimelineStore(s => s.prunedServices);

  const setDetailPanelMode = useCallback(
    (mode: SpanDetailPanelMode) => {
      setDetailPanelModeZustand(mode);
      reduxSetDetailPanelMode(mode);
    },
    [reduxSetDetailPanelMode]
  );

  const setTimelineBarsVisible = useCallback(
    (visible: boolean) => {
      zustandSetTimelineBarsVisible(visible);
      reduxSetTimelineBarsVisible(visible);
    },
    [zustandSetTimelineBarsVisible, reduxSetTimelineBarsVisible]
  );

  const navigate = useNavigate();

  const archiveTraceState = useArchiveStore(s => (id ? (s.archives[id] ?? null) : null));
  const submitTraceToArchiveFn = useArchiveStore(s => s.submitTraceToArchive);
  const acknowledgeArchiveFn = useArchiveStore(s => s.acknowledge);

  const [headerHeight, setHeaderHeight] = useState<number | TNil>(null);
  const [slimView, setSlimView] = useState(() => Boolean(embedded?.timeline?.collapseTitle));
  const [viewType, setViewType] = useState<ETraceViewType>(ETraceViewType.TraceTimelineViewer);
  const [viewRange, setViewRange] = useState<IViewRange>({ time: { current: [0, 1] } });

  // findMatches and findCount are now reported back from child views via onSearchResults
  const [findMatches, setFindMatches] = useState<Set<string> | null>(null);

  const onSearchResults = useCallback((matches: Set<string> | null) => {
    setFindMatches(matches);
  }, []);
  useEffect(() => {
    if (viewType !== ETraceViewType.TraceGraph) {
      setFindMatches(null);
    }
  }, [uiFind, viewType]);

  const traceIsGenAI = useMemo(
    () =>
      traceData?.spans
        ? traceData.spans.some(s => s.attributes.some(a => a.key.startsWith('gen_ai.')))
        : false,
    [traceData]
  );

  const searchBarRef = useRef<InputRef>(null);
  const headerElmRef = useRef<HTMLElement | TNil>(null);
  const viewRangeRef = useRef(viewRange);
  viewRangeRef.current = viewRange;
  const prevIdRef = useRef(id);
  const idRef = useRef(id);
  idRef.current = id;

  const filterSpansMemo = useRef(
    _memoize(filterSpans, (textFilter: string) => `${textFilter} ${idRef.current}`)
  ).current;

  const scrollManagerRef = useRef<ScrollManager>(new ScrollManager(traceData, { scrollBy, scrollTo }));

  const updateViewRangeTime: TUpdateViewRangeTimeFunction = useCallback(
    (start: number, end: number, trackSrc?: string) => {
      if (trackSrc) {
        trackRange(trackSrc, [start, end], viewRangeRef.current.time.current);
      }
      const current: [number, number] = [start, end];
      setViewRange(prev => ({ ...prev, time: { current } }));
    },
    []
  );

  const updateNextViewRangeTime = useCallback((update: ViewRangeTimeUpdate) => {
    setViewRange(prev => ({ ...prev, time: { ...prev.time, ...update } }));
  }, []);

  const clearSearch = useCallback(() => {
    updateUiFind({ navigate, location, trackFindFunction: trackFilter });
    searchBarRef.current?.blur();
  }, [navigate, location]);

  const focusOnSearchBar = useCallback(() => {
    searchBarRef.current?.focus();
  }, []);

  const clearSearchRef = useRef(clearSearch);
  clearSearchRef.current = clearSearch;
  const focusOnSearchBarRef = useRef(focusOnSearchBar);
  focusOnSearchBarRef.current = focusOnSearchBar;

  const adjustViewRange = useCallback(
    (startChange: number, endChange: number, trackSrc: string) => {
      const [viewStart, viewEnd] = viewRangeRef.current.time.current;
      const [start, end] = computeAdjustedRange(viewStart, viewEnd, startChange, endChange);
      updateViewRangeTime(start, end, trackSrc);
    },
    [updateViewRangeTime]
  );

  // Mount: setup keyboard shortcuts, initial fetch, initial view range
  useEffect(() => {
    const sm = scrollManagerRef.current;
    const { scrollPageDown, scrollPageUp, scrollToNextVisibleSpan, scrollToPrevVisibleSpan } = sm;
    const adjViewRange = (a: number, b: number) => adjustViewRange(a, b, 'kbd');
    const shortcutCallbacks = makeShortcutCallbacks(adjViewRange);
    shortcutCallbacks.scrollPageDown = scrollPageDown;
    shortcutCallbacks.scrollPageUp = scrollPageUp;
    shortcutCallbacks.scrollToNextVisibleSpan = scrollToNextVisibleSpan;
    shortcutCallbacks.scrollToPrevVisibleSpan = scrollToPrevVisibleSpan;
    shortcutCallbacks.clearSearch = () => clearSearchRef.current();
    shortcutCallbacks.searchSpans = () => focusOnSearchBarRef.current();
    resetShortcuts();
    mergeShortcuts(shortcutCallbacks);

    return () => {
      resetShortcuts();
      cancelScroll();
      sm.destroy();
    };
  }, [adjustViewRange]);

  useEffect(() => {
    scrollManagerRef.current.setTrace(traceData);
  }, [traceData]);

  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      updateViewRangeTime(0, 1);
      clearSearch();
    }
  }, [id, updateViewRangeTime, clearSearch]);

  const headerResizeObserverRef = useRef<ResizeObserver | TNil>(null);

  const headerRefCallback = useCallback((elm: HTMLElement | TNil) => {
    if (headerResizeObserverRef.current) {
      headerResizeObserverRef.current.disconnect();
      headerResizeObserverRef.current = null;
    }
    headerElmRef.current = elm;
    if (elm) {
      setHeaderHeight(elm.clientHeight);
      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
          setHeaderHeight(elm.clientHeight);
        });
        resizeObserver.observe(elm);
        headerResizeObserverRef.current = resizeObserver;
      }
    } else {
      setHeaderHeight(null);
    }
  }, []);

  const toggleSlimView = useCallback(() => {
    setSlimView(prev => {
      trackSlimHeaderToggle(!prev);
      return !prev;
    });
  }, []);

  const setTraceView = useCallback((newViewType: ETraceViewType) => {
    setViewType(newViewType);
  }, []);

  useEffect(() => {
    if (traceIsGenAI) {
      setTraceView(ETraceViewType.GenAITimelineViewer);
    } else {
      setViewType(vt =>
        vt === ETraceViewType.GenAITimelineViewer ? ETraceViewType.TraceTimelineViewer : vt
      );
    }
  }, [traceIsGenAI, setTraceView]);

  const archiveTrace = useCallback(() => {
    submitTraceToArchiveFn(id);
  }, [submitTraceToArchiveFn, id]);

  const acknowledgeArchive = useCallback(() => {
    acknowledgeArchiveFn(id);
  }, [acknowledgeArchiveFn, id]);

  const focusUiFindMatches = useCallback(() => {
    if (traceData) {
      trackFocusMatches();
      focusUiFindMatchesProp(traceData, uiFind);
      zustandFocusUiFindMatches(traceData, uiFind);
    }
  }, [focusUiFindMatchesProp, zustandFocusUiFindMatches, traceData, uiFind]);

  const nextResult = useCallback(() => {
    trackNextMatch();
    scrollManagerRef.current.scrollToNextVisibleSpan();
  }, []);

  const prevResult = useCallback(() => {
    trackPrevMatch();
    scrollManagerRef.current.scrollToPrevVisibleSpan();
  }, []);

  const onDetailPanelModeToggle = useCallback(() => {
    setDetailPanelMode(detailPanelMode === 'inline' ? 'sidepanel' : 'inline');
  }, [detailPanelMode, setDetailPanelMode]);

  const onTimelineToggle = useCallback(() => {
    setTimelineBarsVisible(!timelineBarsVisible);
  }, [setTimelineBarsVisible, timelineBarsVisible]);

  if (traceError) {
    return <ErrorMessage className="ub-m3" error={traceQueryError || 'Unknown error'} />;
  }
  if (traceLoading || !traceData) {
    return <LoadingIndicator className="u-mt-vast" centered />;
  }

  // spanFindMatches is still computed here for TraceTimelineViewer and other views
  let spanFindMatches: Set<string> | null | undefined;
  if (uiFind && viewType !== ETraceViewType.TraceGraph) {
    const allMatches = filterSpansMemo(uiFind, _get(traceData, 'spans'));
    const otelTrace = traceData;
    spanFindMatches =
      otelTrace && prunedServices.size > 0
        ? filterPrunedSpanIDs(allMatches, otelTrace.spanMap, prunedServices)
        : allMatches;
  }
  const findCount =
    viewType === ETraceViewType.TraceGraph
      ? findMatches
        ? findMatches.size
        : 0
      : spanFindMatches
        ? spanFindMatches.size
        : 0;

  const locationState = location.state;
  const isEmbedded = Boolean(embedded);
  const hasArchiveStorage = Boolean(backendCapabilities?.archiveStorage);
  const headerProps = {
    focusUiFindMatches,
    slimView,
    textFilter: uiFind,
    viewType,
    viewRange,
    canCollapse: !embedded || !embedded.timeline?.hideSummary || !embedded.timeline?.hideMinimap,
    clearSearch,
    detailPanelMode,
    enableSidePanel,
    hideMap: !viewTypeShowsMinimap(viewType) || Boolean(embedded?.timeline?.hideMinimap),
    hideSummary: Boolean(embedded?.timeline?.hideSummary),
    linkToStandalone: getUrl(id),
    nextResult,
    onArchiveClicked: archiveTrace,
    onDetailPanelModeToggle,
    onSlimViewClicked: toggleSlimView,
    onTimelineToggle,
    onTraceViewChange: setTraceView,
    prevResult,
    ref: searchBarRef,
    resultCount: findCount,
    disableJsonView,
    showArchiveButton: !isEmbedded && archiveEnabled && hasArchiveStorage,
    showStandaloneLink: isEmbedded,
    showViewOptions: !isEmbedded,
    timelineBarsVisible,
    toSearch: (locationState && locationState.fromSearch) || null,
    trace: traceData,
    updateNextViewRangeTime,
    updateViewRangeTime,
    useOtelTerms,
  };

  const sm = scrollManagerRef.current;
  let view;
  const criticalPath = criticalPathEnabled ? memoizedTraceCriticalPath(traceData) : [];
  if (ETraceViewType.TraceTimelineViewer === viewType && headerHeight) {
    view = (
      <TraceTimelineViewer
        registerAccessors={sm.setAccessors}
        scrollToFirstVisibleSpan={sm.scrollToFirstVisibleSpan}
        findMatchesIDs={spanFindMatches}
        trace={traceData}
        criticalPath={criticalPath}
        updateNextViewRangeTime={updateNextViewRangeTime}
        updateViewRangeTime={updateViewRangeTime}
        viewRange={viewRange}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.GenAITimelineViewer === viewType && headerHeight) {
    view = (
      <TraceTimelineViewer
        registerAccessors={sm.setAccessors}
        scrollToFirstVisibleSpan={sm.scrollToFirstVisibleSpan}
        findMatchesIDs={spanFindMatches}
        trace={traceData}
        criticalPath={criticalPath}
        updateNextViewRangeTime={updateNextViewRangeTime}
        updateViewRangeTime={updateViewRangeTime}
        viewRange={viewRange}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.TraceGraph === viewType && headerHeight) {
    view = (
      <TraceGraph
        headerHeight={headerHeight}
        trace={traceData}
        uiFind={uiFind}
        onSearchResults={onSearchResults}
        traceGraphConfig={traceGraphConfig}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.TraceStatistics === viewType && headerHeight) {
    view = (
      <TraceStatistics
        trace={traceData}
        uiFindVertexKeys={spanFindMatches}
        uiFind={uiFind}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.TraceSpansView === viewType && headerHeight) {
    view = (
      <TraceSpanView
        key={traceData.traceID}
        trace={traceData}
        uiFindVertexKeys={spanFindMatches}
        uiFind={uiFind}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.TraceFlamegraph === viewType && headerHeight) {
    view = <TraceFlamegraph trace={traceData} />;
  } else if (ETraceViewType.TraceLogs === viewType && headerHeight) {
    view = <TraceLogsView trace={traceData} useOtelTerms={useOtelTerms} />;
  }

  return (
    <div>
      {archiveEnabled && (
        <ArchiveNotifier acknowledge={acknowledgeArchive} archivedState={archiveTraceState} />
      )}
      <div className="Tracepage--headerSection" ref={headerRefCallback}>
        <TracePageHeader {...headerProps} />
      </div>
      {headerHeight ? <section style={{ paddingTop: headerHeight }}>{view}</section> : null}
    </div>
  );
}

// export for tests
export function mapStateToProps(_state: ReduxState, ownProps: { search?: string }): TReduxProps {
  // uiFind must come from the router search string, not window.location: connect() only re-runs a
  // one-argument mapStateToProps when Redux state changes, so URL-only updates would leave uiFind stale.
  return {
    uiFind: parseUiFind(ownProps.search ?? ''),
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { focusUiFindMatches, setDetailPanelMode, setTimelineBarsVisible } = bindActionCreators(
    timelineActions,
    dispatch
  );
  return {
    focusUiFindMatches,
    setDetailPanelMode,
    setTimelineBarsVisible,
  };
}

const ConnectedTracePage = connect(mapStateToProps, mapDispatchToProps)(TracePageImpl);

type TracePageProps = {
  location: Location<LocationState>;
  params: { id: string };
};

const TracePage = (props: TracePageProps) => {
  const config = useConfig();
  const traceID = props.params.id;
  const { data: traceData } = useTrace(traceID);
  useNormalizeTraceId(traceID, traceData);

  return (
    <ConnectedTracePage
      {...props}
      params={{ ...props.params, id: traceID }}
      archiveEnabled={Boolean(config.archiveEnabled)}
      enableSidePanel={Boolean(config.traceTimeline?.enableSidePanel)}
      backendCapabilities={config.backendCapabilities}
      criticalPathEnabled={config.criticalPathEnabled}
      disableJsonView={config.disableJsonView}
      traceGraphConfig={config.traceGraph}
      useOtelTerms={config.useOpenTelemetryTerms}
    />
  );
};

export default withRouteProps(TracePage);
