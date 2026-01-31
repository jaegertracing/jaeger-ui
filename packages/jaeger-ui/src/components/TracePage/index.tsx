// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { InputRef } from 'antd';
import { Location, History as RouterHistory } from 'history';
import _clamp from 'lodash/clamp';
import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import _memoize from 'lodash/memoize';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import ArchiveNotifier from './ArchiveNotifier';
import { actions as archiveActions } from './ArchiveNotifier/duck';
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
import { TEv } from './TraceGraph/types';
import { trackSlimHeaderToggle } from './TracePageHeader/TracePageHeader.track';
import { useConfig } from '../../hooks/useConfig';
import TracePageHeader from './TracePageHeader';
import TraceTimelineViewer from './TraceTimelineViewer';
import { actions as timelineActions } from './TraceTimelineViewer/duck';
import { TUpdateViewRangeTimeFunction, IViewRange, ViewRangeTimeUpdate, ETraceViewType } from './types';
import { getLocation, getUrl } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { extractUiFindFromState } from '../common/UiFindInput';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { getUiFindVertexKeys } from '../TraceDiff/TraceDiffGraph/traceDiffGraphUtils';
import { fetchedState } from '../../constants';
import { FetchedTrace, LocationState, ReduxState, TNil } from '../../types';
import { IOtelTrace } from '../../types/otel';
import { TraceArchive } from '../../types/archive';
import { EmbeddedState } from '../../types/embedded';
import filterSpans from '../../utils/filter-spans';
import updateUiFind from '../../utils/update-ui-find';
import TraceStatistics from './TraceStatistics/index';
import TraceSpanView from './TraceSpanView/index';
import TraceFlamegraph from './TraceFlamegraph/index';
import { StorageCapabilities, TraceGraphConfig } from '../../types/config';

import './index.css';
import memoizedTraceCriticalPath from './CriticalPath/index';
import withRouteProps from '../../utils/withRouteProps';

type TDispatchProps = {
  acknowledgeArchive: (id: string) => void;
  archiveTrace: (id: string) => void;
  fetchTrace: (id: string) => void;
  focusUiFindMatches: (trace: IOtelTrace, uiFind: string | TNil) => void;
};

type TOwnProps = {
  history: RouterHistory;
  location: Location<LocationState>;
  params: { id: string };
  archiveEnabled: boolean;
  storageCapabilities: StorageCapabilities | TNil;
  criticalPathEnabled: boolean;
  disableJsonView: boolean;
  traceGraphConfig?: TraceGraphConfig;
  useOtelTerms: boolean;
};

type TReduxProps = {
  archiveTraceState: TraceArchive | TNil;
  embedded: null | EmbeddedState;
  id: string;
  searchUrl: null | string;
  trace: FetchedTrace | TNil;
  uiFind: string | TNil;
};

type TProps = TDispatchProps & TOwnProps & TReduxProps;

type TState = {
  headerHeight: number | TNil;
  slimView: boolean;
  viewType: ETraceViewType;
  viewRange: IViewRange;
};

// export for tests
export const VIEW_MIN_RANGE = 0.01;
const VIEW_CHANGE_BASE = 0.005;
const VIEW_CHANGE_FAST = 0.05;

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
export const TracePageImpl = React.memo(
  forwardRef<unknown, TProps>(function TracePageImpl(props, ref) {
    const {
      acknowledgeArchive: acknowledgeArchiveProp,
      archiveEnabled,
      archiveTrace: archiveTraceProp,
      archiveTraceState,
      criticalPathEnabled,
      disableJsonView,
      embedded,
      fetchTrace,
      focusUiFindMatches: focusUiFindMatchesProp,
      id,
      location,
      storageCapabilities,
      trace,
      traceGraphConfig,
      uiFind,
      useOtelTerms,
    } = props;

    // State
    const [headerHeight, setHeaderHeightState] = useState<number | TNil>(null);
    const [slimView, setSlimView] = useState<boolean>(Boolean(embedded && embedded.timeline.collapseTitle));
    const [viewType, setViewType] = useState<ETraceViewType>(ETraceViewType.TraceTimelineViewer);
    const [viewRange, setViewRange] = useState<IViewRange>({
      time: {
        current: [0, 1],
      },
    });

    // Refs
    const _headerElm = useRef<HTMLElement | null>(null);
    const _searchBar = useRef<InputRef>(null);
    const traceDagEV = useRef<TEv | TNil>(null);

    // State ref for imperative handle - updated during render for synchronous access
    // This is intentional: useImperativeHandle exposes state getter that must return current values
    const stateRef = useRef<TState>({ headerHeight, slimView, viewType, viewRange });
    stateRef.current = { headerHeight, slimView, viewType, viewRange };

    // Props ref for memoization resolver - must be updated during render
    // The _filterSpans memoization below uses propsRef.current in its cache key resolver.
    // If we moved this update to useEffect, the resolver would read stale props during render,
    // causing incorrect cache hits/misses. This is a deliberate trade-off: we update the ref
    // during render to ensure memoization works correctly, accepting that this technically
    // violates React's "no side effects during render" guideline.
    const propsRef = useRef(props);
    propsRef.current = props;

    // Create memoized filterSpans function
    // Empty dependency array is intentional: the memoize resolver uses propsRef.current
    // which always reflects current props. Recreating the memoize function would clear
    // its internal cache, defeating the purpose of memoization across renders.
    const _filterSpans = useMemo(
      () =>
        _memoize(
          filterSpans,
          // Do not use the memo if the filter text or trace has changed.
          // trace.data.spans is populated after the initial render via mutation.
          (textFilter: string | TNil) =>
            `${textFilter} ${_get(propsRef.current.trace, 'traceID')} ${_get(propsRef.current.trace, 'data.spans.length')}`
        ),
      []
    );

    // Create scroll manager
    const _scrollManager = useRef<ScrollManager>(
      new ScrollManager(trace && trace.data ? trace.data.asOtelTrace() : undefined, {
        scrollBy,
        scrollTo,
      })
    );

    // Methods
    const updateViewRangeTime: TUpdateViewRangeTimeFunction = useCallback(
      (start: number, end: number, trackSrc?: string) => {
        if (trackSrc) {
          trackRange(trackSrc, [start, end], stateRef.current.viewRange.time.current);
        }
        const current: [number, number] = [start, end];
        const time = { current };
        setViewRange(prevViewRange => ({ ...prevViewRange, time }));
      },
      []
    );

    const updateNextViewRangeTime = useCallback((update: ViewRangeTimeUpdate) => {
      setViewRange(prevViewRange => {
        const time = { ...prevViewRange.time, ...update };
        return { ...prevViewRange, time };
      });
    }, []);

    const _adjustViewRange = useCallback(
      (startChange: number, endChange: number, trackSrc: string) => {
        const [viewStart, viewEnd] = stateRef.current.viewRange.time.current;
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
        updateViewRangeTime(start, end, trackSrc);
      },
      [updateViewRangeTime]
    );

    const setHeaderHeight = useCallback((elm: HTMLElement | TNil) => {
      _headerElm.current = elm ?? null;
      if (elm) {
        setHeaderHeightState(prevHeight => {
          if (prevHeight !== elm.clientHeight) {
            return elm.clientHeight;
          }
          return prevHeight;
        });
      } else {
        setHeaderHeightState(prevHeight => {
          if (prevHeight) {
            return null;
          }
          return prevHeight;
        });
      }
    }, []);

    const clearSearch = useCallback(() => {
      const currentProps = propsRef.current;
      updateUiFind({
        history: currentProps.history,
        location: currentProps.location,
        trackFindFunction: trackFilter,
      });
      if (_searchBar.current) _searchBar.current.blur();
    }, []);

    const focusOnSearchBar = useCallback(() => {
      if (_searchBar.current) _searchBar.current.focus();
    }, []);

    const toggleSlimView = useCallback(() => {
      setSlimView(prevSlimView => {
        trackSlimHeaderToggle(!prevSlimView);
        return !prevSlimView;
      });
    }, []);

    const setTraceView = useCallback((newViewType: ETraceViewType) => {
      const currentProps = propsRef.current;
      if (currentProps.trace && currentProps.trace.data && newViewType === ETraceViewType.TraceGraph) {
        traceDagEV.current = calculateTraceDagEV(currentProps.trace.data.asOtelTrace());
      }
      setViewType(newViewType);
    }, []);

    const archiveTrace = useCallback(() => {
      const currentProps = propsRef.current;
      archiveTraceProp(currentProps.id);
    }, [archiveTraceProp]);

    const acknowledgeArchive = useCallback(() => {
      const currentProps = propsRef.current;
      acknowledgeArchiveProp(currentProps.id);
    }, [acknowledgeArchiveProp]);

    const ensureTraceFetched = useCallback(() => {
      const currentProps = propsRef.current;
      if (!currentProps.trace) {
        fetchTrace(currentProps.id);
        return;
      }
      if (currentProps.id && currentProps.id !== currentProps.id.toLowerCase()) {
        currentProps.history.replace(getLocation(currentProps.id.toLowerCase(), currentProps.location.state));
      }
    }, [fetchTrace]);

    const focusUiFindMatches = useCallback(() => {
      const currentProps = propsRef.current;
      if (currentProps.trace && currentProps.trace.data) {
        trackFocusMatches();
        focusUiFindMatchesProp(currentProps.trace.data.asOtelTrace(), currentProps.uiFind);
      }
    }, [focusUiFindMatchesProp]);

    const nextResult = useCallback(() => {
      trackNextMatch();
      _scrollManager.current.scrollToNextVisibleSpan();
    }, []);

    const prevResult = useCallback(() => {
      trackPrevMatch();
      _scrollManager.current.scrollToPrevVisibleSpan();
    }, []);

    // componentDidMount equivalent - runs only once on mount
    useEffect(() => {
      ensureTraceFetched();
      updateViewRangeTime(0, 1);

      resetShortcuts();

      const { scrollPageDown, scrollPageUp, scrollToNextVisibleSpan, scrollToPrevVisibleSpan } =
        _scrollManager.current;
      const adjViewRange = (a: number, b: number) => _adjustViewRange(a, b, 'kbd');
      const shortcutCallbacks = makeShortcutCallbacks(adjViewRange);
      shortcutCallbacks.scrollPageDown = scrollPageDown;
      shortcutCallbacks.scrollPageUp = scrollPageUp;
      shortcutCallbacks.scrollToNextVisibleSpan = scrollToNextVisibleSpan;
      shortcutCallbacks.scrollToPrevVisibleSpan = scrollToPrevVisibleSpan;
      shortcutCallbacks.clearSearch = clearSearch;
      shortcutCallbacks.searchSpans = focusOnSearchBar;
      mergeShortcuts(shortcutCallbacks);

      // Cleanup on unmount
      return () => {
        resetShortcuts();
        cancelScroll();
        _scrollManager.current.destroy();
        _scrollManager.current = new ScrollManager(undefined, {
          scrollBy,
          scrollTo,
        });
      };
      // Empty dependency array: mirrors original componentDidMount behavior.
      // Callbacks are captured at mount time; subsequent changes don't require re-registration.
    }, []);

    // Track previous id for componentDidUpdate logic
    const prevIdRef = useRef<string | undefined>(undefined);

    // componentDidUpdate equivalent
    useEffect(() => {
      _scrollManager.current.setTrace(trace && trace.data ? trace.data.asOtelTrace() : undefined);
      setHeaderHeight(_headerElm.current);

      if (!trace) {
        ensureTraceFetched();
        return;
      }

      if (prevIdRef.current !== undefined && prevIdRef.current !== id) {
        updateViewRangeTime(0, 1);
        clearSearch();
      }

      prevIdRef.current = id;
    }, [trace, id, setHeaderHeight, ensureTraceFetched, updateViewRangeTime, clearSearch]);

    // Expose methods for tests
    useImperativeHandle(ref, () => {
      const handle = {
        get state(): TState {
          return stateRef.current;
        },
        setState: (
          newState: Partial<TState> | ((prev: TState) => Partial<TState>),
          callback?: () => void
        ) => {
          const updates = typeof newState === 'function' ? newState(stateRef.current) : newState;
          if (updates.headerHeight !== undefined) setHeaderHeightState(updates.headerHeight);
          if (updates.slimView !== undefined) setSlimView(updates.slimView);
          if (updates.viewType !== undefined) setViewType(updates.viewType);
          if (updates.viewRange !== undefined) setViewRange(updates.viewRange);
          // Note: callback is invoked after state updates are scheduled, but React may not
          // have committed updates yet. Consumers needing post-render logic should use useEffect.
          if (callback) setTimeout(callback, 0);
        },
        _headerElm,
        _searchBar,
        _scrollManager: _scrollManager.current,
        _filterSpans,
        get traceDagEV() {
          return traceDagEV.current;
        },
        _adjustViewRange,
        setHeaderHeight,
        clearSearch,
        focusOnSearchBar,
        updateViewRangeTime,
        updateNextViewRangeTime,
        toggleSlimView,
        setTraceView,
        archiveTrace,
        acknowledgeArchive,
        ensureTraceFetched,
        focusUiFindMatches,
        nextResult,
        prevResult,
      };
      return handle;
    }, [
      _adjustViewRange,
      setHeaderHeight,
      clearSearch,
      focusOnSearchBar,
      updateViewRangeTime,
      updateNextViewRangeTime,
      toggleSlimView,
      setTraceView,
      archiveTrace,
      acknowledgeArchive,
      ensureTraceFetched,
      focusUiFindMatches,
      nextResult,
      prevResult,
      _filterSpans,
    ]);

    // Render
    const locationState = location.state;

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
        graphFindMatches = getUiFindVertexKeys(uiFind, _get(traceDagEV.current, 'vertices', []));
        findCount = graphFindMatches ? graphFindMatches.size : 0;
      } else {
        spanFindMatches = _filterSpans(uiFind, _get(trace, 'data.spans'));
        findCount = spanFindMatches ? spanFindMatches.size : 0;
      }
    }

    const isEmbedded = Boolean(embedded);
    const hasArchiveStorage = Boolean(storageCapabilities?.archiveStorage);
    const headerProps = {
      focusUiFindMatches,
      slimView,
      textFilter: uiFind,
      viewType,
      viewRange,
      canCollapse: !embedded || !embedded.timeline.hideSummary || !embedded.timeline.hideMinimap,
      clearSearch,
      hideMap: Boolean(
        viewType !== ETraceViewType.TraceTimelineViewer || (embedded && embedded.timeline.hideMinimap)
      ),
      hideSummary: Boolean(embedded && embedded.timeline.hideSummary),
      linkToStandalone: getUrl(id),
      nextResult,
      onArchiveClicked: archiveTrace,
      onSlimViewClicked: toggleSlimView,
      onTraceViewChange: setTraceView,
      prevResult,
      ref: _searchBar,
      resultCount: findCount,
      disableJsonView,
      showArchiveButton: !isEmbedded && archiveEnabled && hasArchiveStorage,
      showShortcutsHelp: !isEmbedded,
      showStandaloneLink: isEmbedded,
      showViewOptions: !isEmbedded,
      toSearch: (locationState && locationState.fromSearch) || null,
      trace: data.asOtelTrace(),
      updateNextViewRangeTime,
      updateViewRangeTime,
      useOtelTerms,
    };

    let view;
    const criticalPath = criticalPathEnabled ? memoizedTraceCriticalPath(data.asOtelTrace()) : [];
    if (ETraceViewType.TraceTimelineViewer === viewType && headerHeight) {
      view = (
        <TraceTimelineViewer
          registerAccessors={_scrollManager.current.setAccessors}
          scrollToFirstVisibleSpan={_scrollManager.current.scrollToFirstVisibleSpan}
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
          ev={traceDagEV.current}
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
          trace={data.asOtelTrace()}
          uiFindVertexKeys={spanFindMatches}
          uiFind={uiFind}
          useOtelTerms={useOtelTerms}
        />
      );
    } else if (ETraceViewType.TraceFlamegraph === viewType && headerHeight) {
      view = <TraceFlamegraph trace={trace} />;
    }

    return (
      <div>
        {archiveEnabled && (
          <ArchiveNotifier acknowledge={acknowledgeArchive} archivedState={archiveTraceState} />
        )}
        <div className="Tracepage--headerSection" ref={setHeaderHeight}>
          <TracePageHeader {...headerProps} />
        </div>
        {headerHeight ? <section style={{ paddingTop: headerHeight }}>{view}</section> : null}
      </div>
    );
  })
);

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const { id } = ownProps.params;
  const { archive, embedded, router } = state;
  const { traces } = state.trace;
  const trace = id ? traces[id] : null;
  const archiveTraceState = id ? archive[id] : null;
  const { state: locationState } = router.location;
  const searchUrl = (locationState && locationState.fromSearch) || null;

  return {
    ...extractUiFindFromState(state),
    archiveTraceState,
    embedded,
    id,
    searchUrl,
    trace,
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchTrace } = bindActionCreators(jaegerApiActions, dispatch);
  const { archiveTrace, acknowledge: acknowledgeArchive } = bindActionCreators(archiveActions, dispatch);
  const { focusUiFindMatches } = bindActionCreators(timelineActions, dispatch);
  return { acknowledgeArchive, archiveTrace, fetchTrace, focusUiFindMatches };
}

const ConnectedTracePage = connect(mapStateToProps, mapDispatchToProps)(TracePageImpl);

type TracePageProps = {
  history: RouterHistory;
  location: Location<LocationState>;
  params: { id: string };
};

const TracePage = (props: TracePageProps) => {
  const config = useConfig();
  return (
    <ConnectedTracePage
      {...props}
      archiveEnabled={Boolean(config.archiveEnabled)}
      storageCapabilities={config.storageCapabilities}
      criticalPathEnabled={config.criticalPathEnabled}
      disableJsonView={config.disableJsonView}
      traceGraphConfig={config.traceGraph}
      useOtelTerms={config.useOpenTelemetryTerms}
    />
  );
};

export default withRouteProps(TracePage);
