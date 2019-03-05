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
import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import _memoize from 'lodash/memoize';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import type { Location, Match, RouterHistory } from 'react-router-dom';

import ArchiveNotifier from './ArchiveNotifier';
import { actions as archiveActions } from './ArchiveNotifier/duck';
import { trackRange } from './index.track';
import { merge as mergeShortcuts, reset as resetShortcuts } from './keyboard-shortcuts';
import { cancel as cancelScroll, scrollBy, scrollTo } from './scroll-page';
import ScrollManager from './ScrollManager';
import calculateTraceDagEV from './TraceGraph/calculateTraceDagEV';
import TraceGraph from './TraceGraph/TraceGraph';
import { trackSlimHeaderToggle } from './TracePageHeader/TracePageHeader.track';
import TracePageHeader from './TracePageHeader';
import TraceTimelineViewer from './TraceTimelineViewer';
import { getLocation, getUrl } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { extractUiFindFromState } from '../common/UiFindInput';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { getUiFindVertexKeys } from '../TraceDiff/TraceDiffGraph/traceDiffGraphUtils';
import { fetchedState } from '../../constants';
import filterSpans from '../../utils/filter-spans';
import updateUiFind from '../../utils/update-ui-find';

import type { CombokeysHandler, ShortcutCallbacks } from './keyboard-shortcuts';
import type { ViewRange, ViewRangeTimeUpdate } from './types';
import type { FetchedTrace, ReduxState } from '../../types';
import type { TraceArchive } from '../../types/archive';
import type { EmbeddedState } from '../../types/embedded';

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
  uiFind: ?string,
};

type TracePageState = {
  headerHeight: ?number,
  slimView: boolean,
  traceGraphView: boolean,
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
  _filterSpans: typeof filterSpans;
  _searchBar: { current: Input | null };
  _scrollManager: ScrollManager;
  traceDagEV: Object;

  constructor(props: TracePageProps) {
    super(props);
    const { embedded, trace } = props;
    this.state = {
      headerHeight: null,
      slimView: Boolean(embedded && embedded.timeline.collapseTitle),
      traceGraphView: false,
      viewRange: {
        time: {
          current: [0, 1],
        },
      },
    };
    this._headerElm = null;
    this._filterSpans = _memoize(
      filterSpans,
      // Do not use the memo if the filter text or trace has changed.
      // trace.data.spans is populated after the initial render via mutation.
      textFilter =>
        `${textFilter} ${_get(this.props.trace, 'traceID')} ${_get(this.props.trace, 'data.spans.length')}`
    );
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

  clearSearch = () => {
    const { history, location } = this.props;
    // flow does not allow omitting optional kwargs when using an object literal.
    const arg = {
      history,
      location,
    };
    updateUiFind(arg);
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
    const viewRange = { ...this.state.viewRange, time };
    this.setState({ viewRange });
  };

  updateNextViewRangeTime = (update: ViewRangeTimeUpdate) => {
    const time = { ...this.state.viewRange.time, ...update };
    const viewRange = { ...this.state.viewRange, time };
    this.setState({ viewRange });
  };

  toggleSlimView = () => {
    const { slimView } = this.state;
    trackSlimHeaderToggle(!slimView);
    this.setState({ slimView: !slimView });
  };

  toggleTraceGraphView = () => {
    const { traceGraphView } = this.state;
    if (this.props.trace && this.props.trace.data) {
      this.traceDagEV = calculateTraceDagEV(this.props.trace.data);
    }
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
    const {
      archiveEnabled,
      archiveTraceState,
      embedded,
      id,
      searchUrl,
      uiFind: textFilter,
      trace,
    } = this.props;
    const { slimView, traceGraphView, headerHeight, viewRange } = this.state;
    if (!trace || trace.state === fetchedState.LOADING) {
      return <LoadingIndicator className="u-mt-vast" centered />;
    }
    const { data } = trace;
    if (trace.state === fetchedState.ERROR || !data) {
      return <ErrorMessage className="ub-m3" error={trace.error || 'Unknown error'} />;
    }

    // $FlowIgnore because flow believes Set<string> cannot be assigned to Set<string | number>
    const findMatches: Set<string | number> = traceGraphView
      ? getUiFindVertexKeys(textFilter || '', this.traceDagEV.vertices)
      : this._filterSpans(textFilter || '', _get(trace, 'data.spans'));
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
      resultCount: findMatches ? findMatches.size : 0,
      showArchiveButton: !isEmbedded && archiveEnabled,
      showShortcutsHelp: !isEmbedded,
      showStandaloneLink: isEmbedded,
      showViewOptions: !isEmbedded,
      toSearch: searchUrl,
      trace: data,
      updateNextViewRangeTime: this.updateNextViewRangeTime,
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
              <TraceGraph headerHeight={headerHeight} ev={this.traceDagEV} uiFindVertexKeys={findMatches} />
            </section>
          ) : (
            <section style={{ paddingTop: headerHeight }}>
              <TraceTimelineViewer
                registerAccessors={this._scrollManager.setAccessors}
                findMatchesIDs={findMatches}
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
    ...extractUiFindFromState(state),
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
