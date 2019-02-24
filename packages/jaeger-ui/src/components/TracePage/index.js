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

import * as React from 'react';
import { Input } from 'antd';
import _clamp from 'lodash/clamp';
import _mapValues from 'lodash/mapValues';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import type { Location, Match, RouterHistory } from 'react-router-dom';

import ArchiveNotifier from './ArchiveNotifier';
import { actions as archiveActions } from './ArchiveNotifier/duck';
import { trackFilter, trackRange } from './index.track';
import { merge as mergeShortcuts, reset as resetShortcuts } from './keyboard-shortcuts';
import { cancel as cancelScroll, scrollBy, scrollTo } from './scroll-page';
import ScrollManager from './ScrollManager';
import TraceGraph from './TraceGraph/TraceGraph';
import { trackSlimHeaderToggle } from './TracePageHeader/TracePageHeader.track';
import TracePageHeader from './TracePageHeader';
import TraceTimelineViewer from './TraceTimelineViewer';
import { getLocation, getUrl } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { fetchedState } from '../../constants';

import type { CombokeysHandler, ShortcutCallbacks } from './keyboard-shortcuts';
import type { ViewRange, ViewRangeTimeUpdate } from './types';
import type { FetchedTrace, ReduxState } from '../../types';
import type { TraceArchive } from '../../types/archive';
import type { EmbeddedState } from '../../types/embedded';
import type { KeyValuePair, Span } from '../../types/trace';

import './index.css';

type TracePageProps = {
  acknowledgeArchive: string => void,
  archiveEnabled: boolean,
  archiveTrace: string => void,
  archiveTraceState: ?TraceArchive,
  embedded: null | EmbeddedState,
  fetchTrace: string => void,
  history: RouterHistory,
  id: string,
  location: Location,
  searchUrl: null | string,
  trace: ?FetchedTrace,
};

type TracePageState = {
  findMatchesIDs: ?Set<string>,
  headerHeight: ?number,
  slimView: boolean,
  traceGraphView: boolean,
  textFilter: string,
  viewRange: ViewRange,
};

// export for tests
export const VIEW_MIN_RANGE = 0.01;
const VIEW_CHANGE_BASE = 0.005;
const VIEW_CHANGE_FAST = 0.05;

// export for tests
export const shortcutConfig = {
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
export function makeShortcutCallbacks(adjRange: (number, number) => void): ShortcutCallbacks {
  function getHandler([startChange, endChange]): CombokeysHandler {
    return function combokeyHandler(event: SyntheticKeyboardEvent<any>) {
      event.preventDefault();
      adjRange(startChange, endChange);
    };
  }
  return _mapValues(shortcutConfig, getHandler);
}

// export for tests
export class TracePageImpl extends React.PureComponent<TracePageProps, TracePageState> {
  props: TracePageProps;
  state: TracePageState;

  _headerElm: ?Element;
  _searchBar: { current: Input | null };
  _scrollManager: ScrollManager;

  constructor(props: TracePageProps) {
    super(props);
    const { embedded, trace } = props;
    this.state = {
      findMatchesIDs: null,
      headerHeight: null,
      slimView: Boolean(embedded && embedded.timeline.collapseTitle),
      textFilter: '',
      traceGraphView: false,
      viewRange: {
        time: {
          current: [0, 1],
        },
      },
    };
    this._headerElm = null;
    this._scrollManager = new ScrollManager(trace && trace.data, {
      scrollBy,
      scrollTo,
    });
    this._searchBar = React.createRef();
    resetShortcuts();
  }

  componentDidMount() {
    this.ensureTraceFetched();
    this.updateViewRangeTime(0, 1);
    /* istanbul ignore if */
    if (!this._scrollManager) {
      throw new Error('Invalid state - scrollManager is unset');
    }
    const {
      scrollPageDown,
      scrollPageUp,
      scrollToNextVisibleSpan,
      scrollToPrevVisibleSpan,
    } = this._scrollManager;
    const adjViewRange = (a: number, b: number) => this._adjustViewRange(a, b, 'kbd');
    const shortcutCallbacks = makeShortcutCallbacks(adjViewRange);
    shortcutCallbacks.scrollPageDown = scrollPageDown;
    shortcutCallbacks.scrollPageUp = scrollPageUp;
    shortcutCallbacks.scrollToNextVisibleSpan = scrollToNextVisibleSpan;
    shortcutCallbacks.scrollToPrevVisibleSpan = scrollToPrevVisibleSpan;
    shortcutCallbacks.clearSearch = this.clearSearch;
    shortcutCallbacks.searchSpans = this.focusOnSearchBar;
    mergeShortcuts(shortcutCallbacks);
  }

  componentWillReceiveProps(nextProps: TracePageProps) {
    if (this._scrollManager) {
      const { trace } = nextProps;
      this._scrollManager.setTrace(trace && trace.data);
    }
  }

  componentDidUpdate({ id: prevID }: TracePageProps) {
    const { id, trace } = this.props;
    this.setHeaderHeight(this._headerElm);
    if (!trace) {
      this.ensureTraceFetched();
      return;
    }
    if (prevID !== id) {
      this.updateViewRangeTime(0, 1);
      this.clearSearch();
    }
  }

  componentWillUnmount() {
    resetShortcuts();
    cancelScroll();
    if (this._scrollManager) {
      this._scrollManager.destroy();
      this._scrollManager = new ScrollManager(undefined, {
        scrollBy,
        scrollTo,
      });
    }
  }

  _adjustViewRange(startChange: number, endChange: number, trackSrc: string) {
    const [viewStart, viewEnd] = this.state.viewRange.time.current;
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
    this.updateViewRangeTime(start, end, trackSrc);
  }

  setHeaderHeight = (elm: ?Element) => {
    this._headerElm = elm;
    if (elm) {
      if (this.state.headerHeight !== elm.clientHeight) {
        this.setState({ headerHeight: elm.clientHeight });
      }
    } else if (this.state.headerHeight) {
      this.setState({ headerHeight: null });
    }
  };

  filterSpans = (textFilter: string) => {
    const spans = this.props.trace && this.props.trace.data && this.props.trace.data.spans;
    if (!spans) return null;

    // if a span field includes at least one filter in includeFilters, the span is a match
    const includeFilters = [];

    // values with keys that include text in any one of the excludeKeys will be ignored
    const excludeKeys = [];

    // split textFilter by whitespace, remove empty strings, and extract includeFilters and excludeKeys
    textFilter
      .split(' ')
      .map(s => s.trim())
      .filter(s => s)
      .forEach(w => {
        if (w[0] === '-') {
          excludeKeys.push(w.substr(1).toLowerCase());
        } else {
          includeFilters.push(w.toLowerCase());
        }
      });

    const isTextInFilters = (filters: Array<string>, text: string) =>
      filters.some(filter => text.toLowerCase().includes(filter));

    const isTextInKeyValues = (kvs: Array<KeyValuePair>) =>
      kvs
        ? kvs.some(kv => {
            // ignore checking key and value for a match if key is in excludeKeys
            if (isTextInFilters(excludeKeys, kv.key)) return false;
            // match if key or value matches an item in includeFilters
            return (
              isTextInFilters(includeFilters, kv.key) || isTextInFilters(includeFilters, kv.value.toString())
            );
          })
        : false;

    const isSpanAMatch = (span: Span) =>
      isTextInFilters(includeFilters, span.operationName) ||
      isTextInFilters(includeFilters, span.process.serviceName) ||
      isTextInKeyValues(span.tags) ||
      span.logs.some(log => isTextInKeyValues(log.fields)) ||
      isTextInKeyValues(span.process.tags);

    // declare as const because need to disambiguate the type
    const rv: Set<string> = new Set(spans.filter(isSpanAMatch).map((span: Span) => span.spanID));
    return rv;
  };

  updateTextFilter = (textFilter: string) => {
    let findMatchesIDs;
    if (textFilter.trim()) {
      findMatchesIDs = this.filterSpans(textFilter);
    } else {
      findMatchesIDs = null;
    }
    trackFilter(textFilter);
    this.setState({ textFilter, findMatchesIDs });
  };

  clearSearch = () => {
    this.updateTextFilter('');
    if (this._searchBar.current) this._searchBar.current.blur();
  };

  focusOnSearchBar = () => {
    if (this._searchBar.current) this._searchBar.current.focus();
  };

  updateViewRangeTime = (start: number, end: number, trackSrc?: string) => {
    if (trackSrc) {
      trackRange(trackSrc, [start, end], this.state.viewRange.time.current);
    }
    const time = { current: [start, end] };
    this.setState((state: TracePageState) => ({ viewRange: { ...state.viewRange, time } }));
  };

  updateNextViewRangeTime = (update: ViewRangeTimeUpdate) => {
    this.setState((state: TracePageState) => ({ viewRange: { ...state.viewRange, ...update } }));
  };

  toggleSlimView = () => {
    const { slimView } = this.state;
    trackSlimHeaderToggle(!slimView);
    this.setState({ slimView: !slimView });
  };

  toggleTraceGraphView = () => {
    const { traceGraphView } = this.state;
    this.setState({ traceGraphView: !traceGraphView });
  };

  archiveTrace = () => {
    const { id, archiveTrace } = this.props;
    archiveTrace(id);
  };

  acknowledgeArchive = () => {
    const { id, acknowledgeArchive } = this.props;
    acknowledgeArchive(id);
  };

  ensureTraceFetched() {
    const { fetchTrace, location, trace, id } = this.props;
    if (!trace) {
      fetchTrace(id);
      return;
    }
    const { history } = this.props;
    if (id && id !== id.toLowerCase()) {
      history.replace(getLocation(id.toLowerCase(), location.state));
    }
  }

  render() {
    const { archiveEnabled, archiveTraceState, embedded, id, searchUrl, trace } = this.props;
    const { slimView, traceGraphView, headerHeight, textFilter, viewRange, findMatchesIDs } = this.state;
    if (!trace || trace.state === fetchedState.LOADING) {
      return <LoadingIndicator className="u-mt-vast" centered />;
    }
    const { data } = trace;
    if (trace.state === fetchedState.ERROR || !data) {
      return <ErrorMessage className="ub-m3" error={trace.error || 'Unknown error'} />;
    }

    const isEmbedded = Boolean(embedded);
    const headerProps = {
      slimView,
      textFilter,
      traceGraphView,
      viewRange,
      canCollapse: !embedded || !embedded.timeline.hideSummary || !embedded.timeline.hideMinimap,
      clearSearch: this.clearSearch,
      hideMap: Boolean(traceGraphView || (embedded && embedded.timeline.hideMinimap)),
      hideSummary: Boolean(embedded && embedded.timeline.hideSummary),
      linkToStandalone: getUrl(id),
      nextResult: this._scrollManager.scrollToNextVisibleSpan,
      onArchiveClicked: this.archiveTrace,
      onSlimViewClicked: this.toggleSlimView,
      onTraceGraphViewClicked: this.toggleTraceGraphView,
      prevResult: this._scrollManager.scrollToPrevVisibleSpan,
      ref: this._searchBar,
      resultCount: findMatchesIDs ? findMatchesIDs.size : 0,
      showArchiveButton: !isEmbedded && archiveEnabled,
      showShortcutsHelp: !isEmbedded,
      showStandaloneLink: isEmbedded,
      showViewOptions: !isEmbedded,
      toSearch: searchUrl,
      trace: data,
      updateNextViewRangeTime: this.updateNextViewRangeTime,
      updateTextFilter: this.updateTextFilter,
      updateViewRangeTime: this.updateViewRangeTime,
    };

    return (
      <div>
        {archiveEnabled && (
          <ArchiveNotifier acknowledge={this.acknowledgeArchive} archivedState={archiveTraceState} />
        )}
        <div className="Tracepage--headerSection" ref={this.setHeaderHeight}>
          <TracePageHeader {...headerProps} />
        </div>
        {headerHeight &&
          (traceGraphView ? (
            <section style={{ paddingTop: headerHeight }}>
              <TraceGraph headerHeight={headerHeight} trace={data} />
            </section>
          ) : (
            <section style={{ paddingTop: headerHeight }}>
              <TraceTimelineViewer
                registerAccessors={this._scrollManager.setAccessors}
                findMatchesIDs={findMatchesIDs}
                trace={data}
                updateNextViewRangeTime={this.updateNextViewRangeTime}
                updateViewRangeTime={this.updateViewRangeTime}
                viewRange={viewRange}
              />
            </section>
          ))}
      </div>
    );
  }
}

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: { match: Match }) {
  const { id } = ownProps.match.params;
  const { archive, config, embedded, router } = state;
  const { traces } = state.trace;
  const trace = id ? traces[id] : null;
  const archiveTraceState = id ? archive[id] : null;
  const archiveEnabled = Boolean(config.archiveEnabled);
  const { state: locationState } = router.location;
  const searchUrl = (locationState && locationState.fromSearch) || null;
  return {
    archiveEnabled,
    archiveTraceState,
    embedded,
    id,
    searchUrl,
    trace,
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Function) {
  const { fetchTrace } = bindActionCreators(jaegerApiActions, dispatch);
  const { archiveTrace, acknowledge: acknowledgeArchive } = bindActionCreators(archiveActions, dispatch);
  return { acknowledgeArchive, archiveTrace, fetchTrace };
}

export default connect(mapStateToProps, mapDispatchToProps)(TracePageImpl);
