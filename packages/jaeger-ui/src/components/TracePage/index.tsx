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
import { getEmbeddedFromUrl } from '../../stores/embedded-store';
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
import calculateTraceDagEV from './TraceGraph/calculateTraceDagEV';
import TraceGraph from './TraceGraph/TraceGraph';
import { trackSlimHeaderToggle } from './TracePageHeader/TracePageHeader.track';
import { useConfig } from '../../hooks/useConfig';
import TracePageHeader from './TracePageHeader';
import TraceTimelineViewer from './TraceTimelineViewer';
import { actions as timelineActions } from './TraceTimelineViewer/duck';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate, ETraceViewType } from './types';
import { getUrl } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { extractUiFindFromState } from '../common/UiFindInput';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { getUiFindVertexKeys } from '../TraceDiff/TraceDiffGraph/traceDiffGraphUtils';
import { fetchedState } from '../../constants';
import { FetchedTrace, LocationState, ReduxState, TNil } from '../../types';
import { IOtelTrace } from '../../types/otel';
import filterSpans from '../../utils/filter-spans';
import updateUiFind from '../../utils/update-ui-find';
import TraceStatistics from './TraceStatistics/index';
import TraceSpanView from './TraceSpanView/index';
import TraceFlamegraph from './TraceFlamegraph/index';
import TraceLogsView from './TraceLogsView/index';
import type { SpanDetailPanelMode, StorageCapabilities, TraceGraphConfig } from '../../types/config';

import './index.css';
import memoizedTraceCriticalPath from './CriticalPath/index';
import withRouteProps from '../../utils/withRouteProps';

type TDispatchProps = {
  fetchTrace: (id: string) => void;
  focusUiFindMatches: (trace: IOtelTrace, uiFind: string | TNil) => void;
  setDetailPanelMode: (mode: SpanDetailPanelMode) => void;
  setTimelineBarsVisible: (visible: boolean) => void;
};

type TOwnProps = {
  location: Location<LocationState>;
  params: { id: string };
  archiveEnabled: boolean;
  enableSidePanel: boolean;
  storageCapabilities: StorageCapabilities | TNil;
  criticalPathEnabled: boolean;
  disableJsonView: boolean;
  traceGraphConfig?: TraceGraphConfig;
  useOtelTerms: boolean;
};

type TReduxProps = {
  id: string;
  trace: FetchedTrace | TNil;
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
  const embedded = getEmbeddedFromUrl();
  const {
    archiveEnabled,
    criticalPathEnabled,
    disableJsonView,
    enableSidePanel,
    fetchTrace,
    focusUiFindMatches: focusUiFindMatchesProp,
    id,
    location,
    setDetailPanelMode: reduxSetDetailPanelMode,
    setTimelineBarsVisible: reduxSetTimelineBarsVisible,
    storageCapabilities,
    trace,
    traceGraphConfig,
    uiFind,
    useOtelTerms,
  } = props;

  // Layout preferences are owned by Zustand; Redux setters are also called for the tracking middleware.
  const detailPanelMode = useLayoutPrefsStore(s => s.detailPanelMode);
  const timelineBarsVisible = useLayoutPrefsStore(s => s.timelineBarsVisible);
  const zustandSetTimelineBarsVisible = useLayoutPrefsStore(s => s.setTimelineBarsVisible);
  const zustandFocusUiFindMatches = useTraceTimelineStore(s => s.focusUiFindMatches);

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

  const traceDagEV = useMemo(
    () =>
      viewType === ETraceViewType.TraceGraph && trace?.data
        ? calculateTraceDagEV(trace.data.asOtelTrace())
        : null,
    [trace, viewType]
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

  const scrollManagerRef = useRef<ScrollManager>(
    new ScrollManager(trace && trace.data ? trace.data.asOtelTrace() : undefined, { scrollBy, scrollTo })
  );

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
    scrollManagerRef.current.setTrace(trace?.data?.asOtelTrace());
  }, [trace]);

  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      if (!trace) {
        fetchTrace(id);
      }
      updateViewRangeTime(0, 1);
      clearSearch();
    } else if (!trace) {
      fetchTrace(id);
      updateViewRangeTime(0, 1);
    }
  }, [id, trace, fetchTrace, updateViewRangeTime, clearSearch]);

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

  const archiveTrace = useCallback(() => {
    submitTraceToArchiveFn(id);
  }, [submitTraceToArchiveFn, id]);

  const acknowledgeArchive = useCallback(() => {
    acknowledgeArchiveFn(id);
  }, [acknowledgeArchiveFn, id]);

  const focusUiFindMatches = useCallback(() => {
    if (trace && trace.data) {
      trackFocusMatches();
      focusUiFindMatchesProp(trace.data.asOtelTrace(), uiFind);
      zustandFocusUiFindMatches(trace.data.asOtelTrace(), uiFind);
    }
  }, [focusUiFindMatchesProp, zustandFocusUiFindMatches, trace, uiFind]);

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

  if (!trace || trace.state === fetchedState.LOADING) {
    return <LoadingIndicator className="u-mt-vast" centered />;
  }
  const { data } = trace;
  if (trace.state === fetchedState.ERROR || !data) {
    return <ErrorMessage className="ub-m3" error={trace.error || 'Unknown error'} />;
  }

  let findCount = 0;
  let graphFindMatches: Set<string> | null | undefined;
  let spanFindMatches: Set<string> | null | undefined;
  if (uiFind) {
    if (viewType === ETraceViewType.TraceGraph) {
      graphFindMatches = getUiFindVertexKeys(uiFind, _get(traceDagEV, 'vertices', []));
      findCount = graphFindMatches ? graphFindMatches.size : 0;
    } else {
      spanFindMatches = filterSpansMemo(uiFind, _get(trace, 'data.spans'));
      findCount = spanFindMatches ? spanFindMatches.size : 0;
    }
  }

  const locationState = location.state;
  const isEmbedded = Boolean(embedded);
  const hasArchiveStorage = Boolean(storageCapabilities?.archiveStorage);
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
    hideMap: Boolean(
      viewType !== ETraceViewType.TraceTimelineViewer || Boolean(embedded?.timeline?.hideMinimap)
    ),
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
    trace: data.asOtelTrace(),
    updateNextViewRangeTime,
    updateViewRangeTime,
    useOtelTerms,
  };

  const sm = scrollManagerRef.current;
  let view;
  const criticalPath = criticalPathEnabled ? memoizedTraceCriticalPath(data.asOtelTrace()) : [];
  if (ETraceViewType.TraceTimelineViewer === viewType && headerHeight) {
    view = (
      <TraceTimelineViewer
        registerAccessors={sm.setAccessors}
        scrollToFirstVisibleSpan={sm.scrollToFirstVisibleSpan}
        findMatchesIDs={spanFindMatches}
        trace={data.asOtelTrace()}
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
        ev={traceDagEV}
        uiFind={uiFind}
        uiFindVertexKeys={graphFindMatches}
        traceGraphConfig={traceGraphConfig}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.TraceStatistics === viewType && headerHeight) {
    view = (
      <TraceStatistics
        trace={data.asOtelTrace()}
        uiFindVertexKeys={spanFindMatches}
        uiFind={uiFind}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.TraceSpansView === viewType && headerHeight) {
    view = (
      <TraceSpanView
        key={data.asOtelTrace().traceID}
        trace={data.asOtelTrace()}
        uiFindVertexKeys={spanFindMatches}
        uiFind={uiFind}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.TraceFlamegraph === viewType && headerHeight) {
    view = <TraceFlamegraph trace={trace} />;
  } else if (ETraceViewType.TraceLogs === viewType && headerHeight) {
    view = <TraceLogsView trace={data.asOtelTrace()} useOtelTerms={useOtelTerms} />;
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
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const { id } = ownProps.params;
  const { traces } = state.trace;
  const trace = id ? traces[id] : null;

  return {
    ...extractUiFindFromState(state),
    id,
    trace,
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchTrace } = bindActionCreators(jaegerApiActions, dispatch);
  const { focusUiFindMatches, setDetailPanelMode, setTimelineBarsVisible } = bindActionCreators(
    timelineActions,
    dispatch
  );
  return {
    fetchTrace,
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
  const normalizedTraceID = useNormalizeTraceId(traceID);

  return (
    <ConnectedTracePage
      {...props}
      params={{ ...props.params, id: normalizedTraceID }}
      archiveEnabled={Boolean(config.archiveEnabled)}
      enableSidePanel={Boolean(config.traceTimeline?.enableSidePanel)}
      storageCapabilities={config.storageCapabilities}
      criticalPathEnabled={config.criticalPathEnabled}
      disableJsonView={config.disableJsonView}
      traceGraphConfig={config.traceGraph}
      useOtelTerms={config.useOpenTelemetryTerms}
    />
  );
};

export default withRouteProps(TracePage);
