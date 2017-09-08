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

import React, { Component } from 'react';
import _maxBy from 'lodash/maxBy';
import _values from 'lodash/values';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import TracePageHeader from './TracePageHeader';
import TraceSpanGraph from './TraceSpanGraph';
import TraceTimelineViewer from './TraceTimelineViewer';
import NotFound from '../App/NotFound';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { getTraceName } from '../../model/trace-viewer';
import { getTraceTimestamp, getTraceEndTimestamp, getTraceId } from '../../selectors/trace';
import colorGenerator from '../../utils/color-generator';

import './index.css';

export default class TracePage extends Component {
  static get propTypes() {
    return {
      fetchTrace: PropTypes.func.isRequired,
      trace: PropTypes.object,
      loading: PropTypes.bool,
      id: PropTypes.string.isRequired,
    };
  }

  static get childContextTypes() {
    return {
      textFilter: PropTypes.string,
      timeRangeFilter: PropTypes.arrayOf(PropTypes.number),
      updateTextFilter: PropTypes.func,
      updateTimeRangeFilter: PropTypes.func,
      slimView: PropTypes.bool,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      textFilter: '',
      timeRangeFilter: [],
      slimView: false,
      headerHeight: null,
    };
    this.headerElm = null;
    this.setHeaderHeight = this.setHeaderHeight.bind(this);
    this.toggleSlimView = this.toggleSlimView.bind(this);
  }

  getChildContext() {
    const state = { ...this.state };
    delete state.headerHeight;
    return {
      updateTextFilter: this.updateTextFilter.bind(this),
      updateTimeRangeFilter: this.updateTimeRangeFilter.bind(this),
      ...state,
    };
  }

  componentDidMount() {
    colorGenerator.clear();
    this.ensureTraceFetched();
    this.setDefaultTimeRange();
  }

  componentDidUpdate({ trace: prevTrace }) {
    const { trace } = this.props;
    this.setHeaderHeight(this.headerElm);
    if (!trace) {
      this.ensureTraceFetched();
      return;
    }
    if (!(trace instanceof Error) && (!prevTrace || getTraceId(prevTrace) !== getTraceId(trace))) {
      this.setDefaultTimeRange();
    }
  }

  setHeaderHeight(elm) {
    this.headerElm = elm;
    if (elm) {
      if (this.state.headerHeight !== elm.clientHeight) {
        this.setState({ headerHeight: elm.clientHeight });
      }
    } else if (this.state.headerHeight) {
      this.setState({ headerHeight: null });
    }
  }

  setDefaultTimeRange() {
    const { trace } = this.props;
    if (!trace) {
      this.updateTimeRangeFilter(null, null);
      return;
    }
    this.updateTimeRangeFilter(getTraceTimestamp(trace), getTraceEndTimestamp(trace));
  }

  updateTextFilter(textFilter) {
    this.setState({ textFilter });
  }

  updateTimeRangeFilter(...timeRangeFilter) {
    this.setState({ timeRangeFilter });
  }

  toggleSlimView() {
    this.setState({ slimView: !this.state.slimView });
  }

  ensureTraceFetched() {
    const { fetchTrace, trace, id, loading } = this.props;

    if (!trace && !loading) {
      fetchTrace(id);
    }
  }

  render() {
    const { id, trace } = this.props;
    const { slimView, headerHeight } = this.state;

    if (!trace) {
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
          />
          {!slimView && <TraceSpanGraph trace={trace} />}
        </section>
        {headerHeight &&
          <section className="trace-timeline-section" style={{ paddingTop: headerHeight }}>
            <TraceTimelineViewer
              trace={trace}
              timeRangeFilter={this.state.timeRangeFilter}
              textFilter={this.state.textFilter}
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
