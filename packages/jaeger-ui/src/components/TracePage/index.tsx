// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, InputRef } from 'antd';
import { useNormalizeTraceId } from './useNormalizeTraceId';
import { useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import _clamp from 'lodash/clamp';
import _mapValues from 'lodash/mapValues';
import memoizeOne from 'memoize-one';

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
import { useSpanFilter } from './TraceTimelineViewer/useServiceFilter';
import { trackDetailPanelMode, trackTimelineBarsVisible } from './TraceTimelineViewer/store.track';
import {
  TUpdateViewRangeTimeFunction,
  IViewRange,
  ViewRangeTimeUpdate,
  ETraceViewType,
  viewTypeIsNavigable,
  viewTypeShowsMinimap,
} from './types';
import { evaluateSpanFilter, KEEP_NEEDS_LIFT, LEAVES_NO_SPAN, withoutHiddenSpans } from './spanFilter';
import { getUrl } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { parseUiFind } from '../common/UiFindInput';
import { LocationState, TNil } from '../../types';
import { reloadBackendTrace, useTrace } from '../../hooks/useTraceLoading';
import { isUploadedTrace } from '../SearchTracePage/useUploadedTraces';
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
  onReloadTrace?: () => void;
};

type TUrlProps = {
  uiFind: string | TNil;
};

type TProps = TOwnProps & TUrlProps;

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
    location,
    params,
    backendCapabilities,
    traceGraphConfig,
    uiFind,
    useOtelTerms,
    onReloadTrace,
  } = props;

  const id = params.id;
  const {
    data: traceData,
    isPending: traceLoading,
    isError: traceError,
    isFetching: traceFetching,
    error: traceQueryError,
  } = useTrace(id);

  // Layout preferences are owned by Zustand. Each setter tracks before it updates the store.
  const detailPanelMode = useLayoutPrefsStore(s => s.detailPanelMode);
  const timelineBarsVisible = useLayoutPrefsStore(s => s.timelineBarsVisible);
  const zustandSetTimelineBarsVisible = useLayoutPrefsStore(s => s.setTimelineBarsVisible);
  const zustandFocusUiFindMatches = useTraceTimelineStore(s => s.focusUiFindMatches);
  const { spanFilter, applyFilter, spanFilterNode } = useSpanFilter(traceData, detailPanelMode);
  const { hiddenIDs } = useMemo(
    () => evaluateSpanFilter(traceData?.spans, spanFilter),
    [traceData?.spans, spanFilter]
  );

  const setDetailPanelMode = useCallback((mode: SpanDetailPanelMode) => {
    trackDetailPanelMode(mode);
    setDetailPanelModeZustand(mode);
  }, []);

  const setTimelineBarsVisible = useCallback(
    (visible: boolean) => {
      trackTimelineBarsVisible(visible);
      zustandSetTimelineBarsVisible(visible);
    },
    [zustandSetTimelineBarsVisible]
  );

  const navigate = useNavigate();

  const archiveTraceState = useArchiveStore(s => (id ? (s.archives[id] ?? null) : null));
  const submitTraceToArchiveFn = useArchiveStore(s => s.submitTraceToArchive);
  const acknowledgeArchiveFn = useArchiveStore(s => s.acknowledge);

  const [headerHeight, setHeaderHeight] = useState<number | TNil>(null);
  const [slimView, setSlimView] = useState(() => Boolean(embedded?.timeline?.collapseTitle));
  const [viewType, setViewType] = useState<ETraceViewType>(ETraceViewType.TraceTimelineViewer);
  const [viewRange, setViewRange] = useState<IViewRange>({ time: { current: [0, 1] } });
  const [criticalPathErrorDismissed, setCriticalPathErrorDismissed] = useState(false);

  // TraceGraph owns its search (DAG + vertex-key matching) and reports matches through
  // onSearchResults. Every other view uses the span matches computed below in this component,
  // which keeps the header count working for views without search wiring (flamegraph, logs).
  const [findMatches, setFindMatches] = useState<Set<string> | TNil>(null);

  // Read the trace's own verdict rather than re-deriving it here. It is computed
  // once from each span's cached genAIKind, so re-scanning attributes is both
  // redundant and free to drift away from classifySpan as the detector evolves.
  const traceIsGenAI = traceData?.isGenAITrace ?? false;

  const searchBarRef = useRef<InputRef>(null);
  const headerElmRef = useRef<HTMLElement | TNil>(null);
  const viewRangeRef = useRef(viewRange);
  viewRangeRef.current = viewRange;
  const prevIdRef = useRef(id);
  const userPickedViewRef = useRef(false);
  const filterSpansMemo = useRef(memoizeOne(filterSpans)).current;
  // The highlight set is the text matches that the filter leaves visible. The views that draw the
  // whole trace get the text matches alone, and the graph view counts its own. It is memoized so
  // that the row renderers keep one Set identity across renders.
  const timelineFindMatches = useMemo(() => {
    if (!traceData || viewType === ETraceViewType.TraceGraph || !uiFind) return null;
    const textMatches = filterSpansMemo(uiFind, traceData.spans);
    return viewTypeIsNavigable(viewType) ? withoutHiddenSpans(textMatches, hiddenIDs) : textMatches;
  }, [traceData, viewType, uiFind, hiddenIDs, filterSpansMemo]);

  // The conversion menu's entries are disabled when the chip they would make leaves no span shown:
  // keep when no visible span matches the text, hide when every visible span matches or, in remove
  // mode, when every root span does. The popover holds such edits with a warning; the menu has
  // nowhere to show one.
  const keepDisabledReason =
    spanFilter.treeMode !== 'lift'
      ? KEEP_NEEDS_LIFT
      : !timelineFindMatches || timelineFindMatches.size === 0
        ? LEAVES_NO_SPAN
        : null;
  const hideDisabledReason = useMemo(() => {
    if (!traceData || !timelineFindMatches) return null;
    if (timelineFindMatches.size >= traceData.spans.length - hiddenIDs.size) return LEAVES_NO_SPAN;
    // A root the filter already hides has no subtree on screen, so it counts as covered.
    const everyRoot = traceData.rootSpans.every(
      span => hiddenIDs.has(span.spanID) || timelineFindMatches.has(span.spanID)
    );
    return spanFilter.treeMode === 'remove' && everyRoot ? LEAVES_NO_SPAN : null;
  }, [traceData, timelineFindMatches, hiddenIDs, spanFilter.treeMode]);

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
      userPickedViewRef.current = false;
      updateViewRangeTime(0, 1);
      clearSearch();
      setCriticalPathErrorDismissed(false);
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
    setFindMatches(null);
  }, []);

  const onUserViewChange = useCallback(
    (newViewType: ETraceViewType) => {
      userPickedViewRef.current = true;
      setTraceView(newViewType);
    },
    [setTraceView]
  );

  useEffect(() => {
    // A view the user picked from the dropdown is not overridden by the default.
    if (userPickedViewRef.current) return;
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
      zustandFocusUiFindMatches(traceData, timelineFindMatches);
    }
  }, [zustandFocusUiFindMatches, traceData, timelineFindMatches]);

  // Turns the search text into a keep or hide chip and clears the input, in one URL update.
  const convertSearchToClause = useCallback(
    (verb: 'keep' | 'hide') => {
      const text = uiFind?.trim();
      if (!text) return;
      applyFilter(
        { ...spanFilter, clauses: [...spanFilter.clauses, { verb, criterion: { shape: 'text', text } }] },
        { clearUiFind: true }
      );
    },
    [applyFilter, spanFilter, uiFind]
  );

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

  if (traceError && !traceData) {
    return <ErrorMessage className="ub-m3" error={traceQueryError || 'Unknown error'} />;
  }
  if (traceLoading || !traceData) {
    return <LoadingIndicator className="u-mt-vast" centered />;
  }

  // timelineFindMatches is null in the graph view, which counts the text matches alone.
  let findCount = timelineFindMatches ? timelineFindMatches.size : 0;
  if (viewType === ETraceViewType.TraceGraph) {
    findCount = uiFind && findMatches ? findMatches.size : 0;
  }

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
    hideMap:
      !viewTypeShowsMinimap(viewType) || Boolean(embedded?.timeline?.hideMinimap) || !timelineBarsVisible,
    hideSummary: Boolean(embedded?.timeline?.hideSummary),
    linkToStandalone: getUrl(id),
    nextResult,
    onArchiveClicked: archiveTrace,
    onReloadTrace,
    reloadingTrace: traceFetching,
    onDetailPanelModeToggle,
    onSlimViewClicked: toggleSlimView,
    onTimelineToggle,
    onTraceViewChange: onUserViewChange,
    prevResult,
    ref: searchBarRef,
    resultCount: findCount,
    // The graph, statistics and flame graph views draw the whole trace, so the funnel belongs to
    // the timeline views alone.
    keepDisabledReason,
    hideDisabledReason,
    onConvertSearch: convertSearchToClause,
    spanFilterNode: viewTypeIsNavigable(viewType) ? spanFilterNode : null,
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
  const cpResult = criticalPathEnabled
    ? memoizedTraceCriticalPath(traceData)
    : { sections: [], failed: false, errors: [] };
  const criticalPath = cpResult.sections;
  if (ETraceViewType.TraceTimelineViewer === viewType && headerHeight) {
    view = (
      <TraceTimelineViewer
        registerAccessors={sm.setAccessors}
        scrollToFirstVisibleSpan={sm.scrollToFirstVisibleSpan}
        findMatchesIDs={timelineFindMatches}
        pageHeaderHeight={headerHeight}
        trace={traceData}
        criticalPath={criticalPath}
        spanFilterNode={spanFilterNode}
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
        findMatchesIDs={timelineFindMatches}
        pageHeaderHeight={headerHeight}
        trace={traceData}
        criticalPath={criticalPath}
        spanFilterNode={spanFilterNode}
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
        onSearchResults={setFindMatches}
        traceGraphConfig={traceGraphConfig}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.TraceStatistics === viewType && headerHeight) {
    view = (
      <TraceStatistics
        trace={traceData}
        uiFindVertexKeys={timelineFindMatches}
        uiFind={uiFind}
        useOtelTerms={useOtelTerms}
      />
    );
  } else if (ETraceViewType.TraceSpansView === viewType && headerHeight) {
    view = (
      <TraceSpanView
        key={traceData.traceID}
        trace={traceData}
        uiFindVertexKeys={timelineFindMatches}
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
      {cpResult.failed && !criticalPathErrorDismissed && (
        <Alert
          type="warning"
          closable
          onClose={() => setCriticalPathErrorDismissed(true)}
          message="Critical path could not be computed for this trace."
          description={cpResult.errors.join('; ')}
          style={{ margin: '8px 16px' }}
        />
      )}
      <div className="Tracepage--headerSection" ref={headerRefCallback}>
        <TracePageHeader {...headerProps} />
        {traceError && (
          <Alert
            type="warning"
            showIcon
            message="Trace reload failed. Showing the previously loaded trace."
            description={traceQueryError?.message || 'Unknown error'}
          />
        )}
      </div>
      {headerHeight ? <section style={{ paddingTop: headerHeight }}>{view}</section> : null}
    </div>
  );
}

type TracePageProps = {
  location: Location<LocationState>;
  params: { id: string };
};

export const TracePageRoute = (props: TracePageProps) => {
  const config = useConfig();
  const traceID = props.params.id;
  const { data: traceData } = useTrace(traceID);
  useNormalizeTraceId(traceID, traceData);
  // Uploads change only on the search page, which is unmounted on this route,
  // so the registry needs no subscription here. Recheck in the handler before
  // refetching to protect against a stale render.
  const isUploaded = isUploadedTrace(traceID);

  const onReloadTrace = useCallback(() => {
    if (isUploadedTrace(traceID)) return;
    void reloadBackendTrace(traceID);
  }, [traceID]);

  return (
    <TracePageImpl
      {...props}
      uiFind={parseUiFind(props.location.search ?? '')}
      onReloadTrace={isUploaded ? undefined : onReloadTrace}
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

export default withRouteProps(TracePageRoute);
