// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as React from 'react';
import _clamp from 'lodash/clamp';
import _mapKeys from 'lodash/mapKeys';
import _maxBy from 'lodash/maxBy';
import _values from 'lodash/values';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import type { CombokeysHandler, ShortcutCallbacks } from './keyboard-shortcuts';
import { init as initShortcuts, reset as resetShortcuts } from './keyboard-shortcuts';
import { cancel as cancelPageScroll, scrollBy, scrollTo } from './scroll-page';
import ScrollManager from './ScrollManager';
import SpanGraph from './SpanGraph';
import TracePageHeader from './TracePageHeader';
import TraceTimelineViewer from './TraceTimelineViewer';
import type { NextViewRangeType, ViewRange } from './types';
import NotFound from '../App/NotFound';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { getTraceName } from '../../model/trace-viewer';
import type { Trace } from '../../types';
import colorGenerator from '../../utils/color-generator';

import './index.css';

type TracePageProps = {
  fetchTrace: string => void,
  trace: ?Trace,
  loading: boolean,
  id: string,
};

type TracePageState = {
  textFilter: ?string,
  viewRange: ViewRange,
  slimView: boolean,
  headerHeight: ?number,
};

const VIEW_MIN_RANGE = 0.01;
const VIEW_CHANGE_BASE = 0.005;
const VIEW_CHANGE_FAST = 0.05;

const shortcutConfig = {
  panLeft: [-VIEW_CHANGE_BASE, -VIEW_CHANGE_BASE],
  panLeftFast: [-VIEW_CHANGE_FAST, -VIEW_CHANGE_FAST],
  panRight: [VIEW_CHANGE_BASE, VIEW_CHANGE_BASE],
  panRightFast: [VIEW_CHANGE_FAST, VIEW_CHANGE_FAST],
  zoomIn: [VIEW_CHANGE_BASE, -VIEW_CHANGE_BASE],
  zoomInFast: [VIEW_CHANGE_FAST, -VIEW_CHANGE_FAST],
  zoomOut: [-VIEW_CHANGE_BASE, VIEW_CHANGE_BASE],
  zoomOutFast: [-VIEW_CHANGE_FAST, VIEW_CHANGE_FAST],
};

function makeShortcutCallbacks(adjRange): ShortcutCallbacks {
  const callbacks: { [string]: CombokeysHandler } = {};
  _mapKeys(shortcutConfig, ([startChange, endChange], key) => {
    callbacks[key] = (event: SyntheticKeyboardEvent<any>) => {
      event.preventDefault();
      adjRange(startChange, endChange);
    };
  });
  return (callbacks: any);
}

export default class TracePage extends React.PureComponent<TracePageProps, TracePageState> {
  props: TracePageProps;
  state: TracePageState;

  _headerElm: ?Element;
  _scrollManager: ScrollManager;

  constructor(props: TracePageProps) {
    super(props);
    this.setHeaderHeight = this.setHeaderHeight.bind(this);
    this.toggleSlimView = this.toggleSlimView.bind(this);
    this.updateViewRange = this.updateViewRange.bind(this);
    this.updateNextViewRange = this.updateNextViewRange.bind(this);
    this.updateTextFilter = this.updateTextFilter.bind(this);
    this.state = {
      textFilter: '',
      viewRange: { current: [0, 1] },
      slimView: false,
      headerHeight: null,
    };
    this._headerElm = null;
    this._scrollManager = new ScrollManager(props.trace, { scrollBy, scrollTo });
  }

  componentDidMount() {
    colorGenerator.clear();
    this.ensureTraceFetched();
    this.updateViewRange(0, 1);
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
      this.updateViewRange(0, 1);
    }
  }

  componentWillUnmount() {
    resetShortcuts();
    cancelPageScroll();
    if (this._scrollManager) {
      this._scrollManager.destroy();
      this._scrollManager = new ScrollManager(undefined, { scrollBy, scrollTo });
    }
  }

  _adjustViewRange(startChange: number, endChange: number) {
    const [viewStart, viewEnd] = this.state.viewRange.current;
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
    this.updateViewRange(start, end);
  }

  setHeaderHeight = function setHeaderHeight(elm: ?Element) {
    this._headerElm = elm;
    if (elm) {
      if (this.state.headerHeight !== elm.clientHeight) {
        this.setState({ headerHeight: elm.clientHeight });
      }
    } else if (this.state.headerHeight) {
      this.setState({ headerHeight: null });
    }
  };

  updateTextFilter = function updateTextFilter(textFilter: ?string) {
    this.setState({ textFilter });
  };

  updateViewRange = function updateViewRange(start: number, end: number) {
    const viewRange = { current: [start, end] };
    this.setState({ viewRange });
  };

  updateNextViewRange = function updateNextViewRange(
    start: number,
    position: number,
    type: NextViewRangeType
  ) {
    const { current } = this.state.viewRange;
    const viewRange = { current, next: { start, position, type } };
    this.setState({ viewRange });
  };

  toggleSlimView = function toggleSlimView() {
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
            name={getTraceName(spans, processes)}
            numServices={numberOfServices}
            numSpans={spans.length}
            slimView={slimView}
            timestamp={startTime}
            traceID={traceID}
            onSlimViewClicked={this.toggleSlimView}
            textFilter={textFilter}
            updateTextFilter={this.updateTextFilter}
          />
          {!slimView &&
            <SpanGraph
              trace={trace}
              viewRange={viewRange}
              updateViewRange={this.updateViewRange}
              updateNextViewRange={this.updateNextViewRange}
            />}
        </section>
        {headerHeight &&
          <section className="trace-timeline-section" style={{ paddingTop: headerHeight }}>
            <TraceTimelineViewer
              currentViewRange={viewRange.current}
              registerAccessors={this._scrollManager.setAccessors}
              textFilter={textFilter}
              trace={trace}
            />
          </section>}
      </div>
    );
  }
}

// export connected component separately
function mapStateToProps(state, ownProps) {
  const { id } = ownProps.match.params;
  const trace = state.trace.traces[id];
  return { id, trace, loading: state.trace.loading };
}

function mapDispatchToProps(dispatch) {
  const { fetchTrace } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchTrace };
}

export const ConnectedTracePage = connect(mapStateToProps, mapDispatchToProps)(TracePage);
