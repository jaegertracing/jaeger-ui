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
import _maxBy from 'lodash/maxBy';
import _values from 'lodash/values';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import TracePageHeader from './TracePageHeader';
import SpanGraph from './SpanGraph';
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

export default class TracePage extends React.PureComponent<TracePageProps, TracePageState> {
  props: TracePageProps;
  state: TracePageState;

  headerElm: ?Element;

  constructor(props: TracePageProps) {
    super(props);
    this.state = {
      textFilter: '',
      viewRange: { current: [0, 1] },
      slimView: false,
      headerHeight: null,
    };
    this.headerElm = null;
    this.setHeaderHeight = this.setHeaderHeight.bind(this);
    this.toggleSlimView = this.toggleSlimView.bind(this);
    this.updateViewRange = this.updateViewRange.bind(this);
    this.updateNextViewRange = this.updateNextViewRange.bind(this);
    this.updateTextFilter = this.updateTextFilter.bind(this);
  }

  componentDidMount() {
    colorGenerator.clear();
    this.ensureTraceFetched();
    this.updateViewRange(0, 1);
  }

  componentDidUpdate({ trace: prevTrace }: TracePageProps) {
    const { trace } = this.props;
    this.setHeaderHeight(this.headerElm);
    if (!trace) {
      this.ensureTraceFetched();
      return;
    }
    if (!(trace instanceof Error) && (!prevTrace || prevTrace.traceID !== trace.traceID)) {
      this.updateViewRange(0, 1);
    }
  }

  setHeaderHeight = function setHeaderHeight(elm: ?Element) {
    this.headerElm = elm;
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
    console.log('next view range', start, position, type);
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
            <TraceTimelineViewer trace={trace} currentViewRange={viewRange.current} textFilter={textFilter} />
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
