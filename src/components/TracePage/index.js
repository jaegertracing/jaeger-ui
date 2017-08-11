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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Sticky } from 'react-sticky';
import _maxBy from 'lodash/maxBy';
import _values from 'lodash/values';

import './TracePage.css';
import { transformTrace } from './TraceTimelineViewer/transforms';
import * as jaegerApiActions from '../../actions/jaeger-api';
import colorGenerator from '../../utils/color-generator';
// import { getTraceSummary } from '../../model/search';
import { getTraceName } from '../../model/trace-viewer';

import {
  dropEmptyStartTimeSpans,
  hydrateSpansWithProcesses,
  getTraceTimestamp,
  getTraceEndTimestamp,
  getTraceId,
} from '../../selectors/trace';
import NotFound from '../App/NotFound';
import TracePageHeader from './TracePageHeader';
import TraceTimelineViewer from './TraceTimelineViewer';
import TraceSpanGraph from './TraceSpanGraph';

import tracePropTypes from '../../propTypes/trace';

export default class TracePage extends Component {
  static get propTypes() {
    return {
      fetchTrace: PropTypes.func.isRequired,
      trace: tracePropTypes,
      xformedTrace: PropTypes.object,
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
    this.state = { textFilter: '', timeRangeFilter: [], slimView: false };
    this.toggleSlimView = this.toggleSlimView.bind(this);
  }

  getChildContext() {
    return {
      updateTextFilter: this.updateTextFilter.bind(this),
      updateTimeRangeFilter: this.updateTimeRangeFilter.bind(this),
      ...this.state,
    };
  }

  componentDidMount() {
    colorGenerator.clear();
    this.ensureTraceFetched();
    this.setDefaultTimeRange();
  }

  componentDidUpdate({ trace: prevTrace }) {
    const { trace } = this.props;

    if (!trace) {
      this.ensureTraceFetched();
      return;
    }

    if (!(trace instanceof Error) && (!prevTrace || getTraceId(prevTrace) !== getTraceId(trace))) {
      this.setDefaultTimeRange();
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
    // fix issue #12 - TraceView header expander not working correctly
    // TODO: evaluate alternatives to react-sticky
    setTimeout(() => this.forceUpdate(), 0);
  }

  ensureTraceFetched() {
    const { fetchTrace, trace, id, loading } = this.props;

    if (!trace && !loading) {
      fetchTrace(id);
    }
  }

  render() {
    const { id, trace, xformedTrace } = this.props;
    const { slimView } = this.state;

    if (!trace) {
      return <section />;
    }

    if (trace instanceof Error) {
      return <NotFound error={trace} />;
    }

    const { duration, processes, spans, startTime, traceID } = xformedTrace;
    const maxSpanDepth = _maxBy(spans, 'depth').depth + 1;
    const numberOfServices = new Set(_values(processes).map(p => p.serviceName)).size;

    return (
      <section id={`jaeger-trace-${id}`}>
        <Sticky
          topOffset={-50}
          style={{ zIndex: 1000, transform: 'none' }}
          stickyStyle={{ top: 50, zIndex: 1000, background: 'white' }}
        >
          <div style={{ marginTop: 10 }}>
            <TracePageHeader
              durationMs={duration / 1000}
              maxDepth={maxSpanDepth}
              name={getTraceName(spans, processes)}
              numServices={numberOfServices}
              numSpans={spans.length}
              slimView={slimView}
              timestampMs={startTime / 1000}
              traceID={traceID}
              onSlimViewClicked={this.toggleSlimView}
            />
            {!slimView && <TraceSpanGraph trace={trace} xformedTrace={xformedTrace} />}
          </div>
        </Sticky>
        <TraceTimelineViewer
          trace={trace}
          xformedTrace={xformedTrace}
          timeRangeFilter={this.state.timeRangeFilter}
          textFilter={this.state.textFilter}
        />
      </section>
    );
  }
}

// export connected component separately
function mapStateToProps(state, ownProps) {
  const { id } = ownProps.params;
  let trace = state.trace.traces[id];
  let xformedTrace;
  if (trace && !(trace instanceof Error)) {
    trace = dropEmptyStartTimeSpans(trace);
    trace = hydrateSpansWithProcesses(trace);
    xformedTrace = transformTrace(trace);
  }
  return { id, trace, xformedTrace, loading: state.trace.loading };
}

function mapDispatchToProps(dispatch) {
  const { fetchTrace } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchTrace };
}

export const ConnectedTracePage = connect(mapStateToProps, mapDispatchToProps)(TracePage);
