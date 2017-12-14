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
import _clamp from 'lodash/clamp';
import _mapValues from 'lodash/mapValues';
import _maxBy from 'lodash/maxBy';
import _values from 'lodash/values';
import { connect } from 'react-redux';
import type { Match } from 'react-router-dom';
import { bindActionCreators } from 'redux';

import type { CombokeysHandler, ShortcutCallbacks } from './keyboard-shortcuts';
import { init as initShortcuts, reset as resetShortcuts } from './keyboard-shortcuts';
import { cancel as cancelScroll, scrollBy, scrollTo } from './scroll-page';
import ScrollManager from './ScrollManager';
import SpanGraph from './SpanGraph';
import TracePageHeader from './TracePageHeader';
import TraceTimelineViewer from './TraceTimelineViewer';
import type { ViewRange, ViewRangeTimeUpdate } from './types';
import NotFound from '../App/NotFound';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { getTraceName } from '../../model/trace-viewer';
import type { Trace } from '../../types';

import './index.css';

type TracePageProps = {
  fetchTrace: string => void,
  trace: ?Trace,
  loading: boolean,
  id: string,
};

type TracePageState = {
  headerHeight: ?number,
  slimView: boolean,
  textFilter: ?string,
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

export default class TracePage extends React.PureComponent<TracePageProps, TracePageState> {
  props: TracePageProps;
  state: TracePageState;

  _headerElm: ?Element;
  _scrollManager: ScrollManager;

  constructor(props: TracePageProps) {
    super(props);
    this.state = {
      headerHeight: null,
      slimView: false,
      textFilter: '',
      viewRange: {
        time: {
          current: [0, 1],
        },
      },
    };
    this._headerElm = null;
    this._scrollManager = new ScrollManager(props.trace, { scrollBy, scrollTo });
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
    const adjViewRange = (a: number, b: number) => this._adjustViewRange(a, b);
    const shortcutCallbacks = makeShortcutCallbacks(adjViewRange);
    shortcutCallbacks.scrollPageDown = scrollPageDown;
    shortcutCallbacks.scrollPageUp = scrollPageUp;
    shortcutCallbacks.scrollToNextVisibleSpan = scrollToNextVisibleSpan;
    shortcutCallbacks.scrollToPrevVisibleSpan = scrollToPrevVisibleSpan;
    initShortcuts(shortcutCallbacks);
  }

  componentWillReceiveProps(nextProps: TracePageProps) {
    if (this._scrollManager) {
      this._scrollManager.setTrace(nextProps.trace);
    }
  }

  componentDidUpdate({ trace: prevTrace }: TracePageProps) {
    const { trace } = this.props;
    this.setHeaderHeight(this._headerElm);
    if (!trace) {
      this.ensureTraceFetched();
      return;
    }
    if (!(trace instanceof Error) && (!prevTrace || prevTrace.traceID !== trace.traceID)) {
      this.updateViewRangeTime(0, 1);
    }
  }

  componentWillUnmount() {
    resetShortcuts();
    cancelScroll();
    if (this._scrollManager) {
      this._scrollManager.destroy();
      this._scrollManager = new ScrollManager(undefined, { scrollBy, scrollTo });
    }
  }

  _adjustViewRange(startChange: number, endChange: number) {
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
    this.updateViewRangeTime(start, end);
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

  updateTextFilter = (textFilter: ?string) => {
    this.setState({ textFilter });
  };

  updateViewRangeTime = (start: number, end: number) => {
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
    this.setState({ slimView: !this.state.slimView });
  };

  ensureTraceFetched() {
    const { fetchTrace, trace, id, loading } = this.props;
    if (!trace && !loading) {
      fetchTrace(id);
    }
  }

  render() {
    const { id, loading, trace } = this.props;
    const { slimView, headerHeight, textFilter, viewRange } = this.state;

    if (!trace) {
      if (loading) {
        return (
          <div className="m1">
            <div className="ui active centered inline loader" />
          </div>
        );
      }
      return <section />;
    }

    if (trace instanceof Error) {
      return <NotFound error={trace} />;
    }

    const { duration, processes, spans, startTime, traceID } = trace;
    const maxSpanDepth = _maxBy(spans, 'depth').depth + 1;
    const numberOfServices = new Set(_values(processes).map(p => p.serviceName)).size;
    return (
      <div className="trace-page" id={`jaeger-trace-${id}`}>
        <section className="trace-page-header-section" ref={this.setHeaderHeight}>
          <TracePageHeader
            duration={duration}
            maxDepth={maxSpanDepth}
            name={getTraceName(spans)}
            numServices={numberOfServices}
            numSpans={spans.length}
            slimView={slimView}
            timestamp={startTime}
            traceID={traceID}
            onSlimViewClicked={this.toggleSlimView}
            textFilter={textFilter}
            updateTextFilter={this.updateTextFilter}
          />
          {!slimView && (
            <SpanGraph
              trace={trace}
              viewRange={viewRange}
              updateNextViewRangeTime={this.updateNextViewRangeTime}
              updateViewRangeTime={this.updateViewRangeTime}
            />
          )}
        </section>
        {headerHeight && (
          <section className="trace-timeline-section" style={{ paddingTop: headerHeight }}>
            <TraceTimelineViewer
              registerAccessors={this._scrollManager.setAccessors}
              textFilter={textFilter}
              trace={trace}
              updateNextViewRangeTime={this.updateNextViewRangeTime}
              updateViewRangeTime={this.updateViewRangeTime}
              viewRange={viewRange}
            />
          </section>
        )}
      </div>
    );
  }
}

// export for tests
export function mapStateToProps(
  state: { trace: { loading: boolean, traces: { [string]: Trace } } },
  ownProps: { match: Match }
) {
  const { id } = ownProps.match.params;
  const trace = id ? state.trace.traces[id] : null;
  return { id, trace, loading: state.trace.loading };
}

// export for tests
export function mapDispatchToProps(dispatch: Function) {
  const { fetchTrace } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchTrace };
}

export const ConnectedTracePage = connect(mapStateToProps, mapDispatchToProps)(TracePage);
