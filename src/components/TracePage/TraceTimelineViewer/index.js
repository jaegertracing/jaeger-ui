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

import getFilteredSpans from './get-filtered-spans';
import TraceView from './TraceView';
import { getPositionInRange } from './utils';

import './grid.css';
import './index.css';

// TODO: Add unit tests

export default class TraceTimelineViewer extends Component {
  constructor(props) {
    super(props);

    const { textFilter, xformedTrace } = props;
    const filteredSpans = textFilter ? getFilteredSpans(xformedTrace, textFilter) : null;
    this.state = {
      filteredSpans,
      collapsedSpans: new Set(),
      endX: 100,
      selectedSpans: new Set(),
      startX: 0,
      trace: props.xformedTrace,
    };
    this.toggleSpanCollapse = this.toggleSpanCollapse.bind(this);
    this.toggleSpanSelect = this.toggleSpanSelect.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { xformedTrace, textFilter } = nextProps;
    if (textFilter === this.props.textFilter && xformedTrace === this.props.xformedTrace) {
      return;
    }
    const filteredSpans = textFilter ? getFilteredSpans(nextProps.xformedTrace, textFilter) : null;
    this.setState({ filteredSpans, trace: xformedTrace });
  }

  toggleSpanCollapse(spanID) {
    this.toggleStateSet('collapsedSpans', spanID);
  }

  toggleSpanSelect(spanID) {
    this.toggleStateSet('selectedSpans', spanID);
  }

  toggleStateSet(statePropName, spanID) {
    const set = new Set(this.state[statePropName]);
    if (set.has(spanID)) {
      set.delete(spanID);
    } else {
      set.add(spanID);
    }
    this.setState({ [statePropName]: set });
  }

  render() {
    const { selectedSpans, collapsedSpans, filteredSpans, trace } = this.state;
    const { timeRangeFilter: zoomRange } = this.props;
    const { startTime, endTime } = trace;
    return (
      <div className="trace-timeline-viewer">
        <TraceView
          {...this.props}
          trace={trace}
          collapsedSpanIDs={collapsedSpans}
          selectedSpanIDs={selectedSpans}
          filteredSpansIDs={filteredSpans}
          zoomStart={getPositionInRange(startTime, endTime, zoomRange[0])}
          zoomEnd={getPositionInRange(startTime, endTime, zoomRange[1])}
          onSpanClick={this.toggleSpanSelect}
          onSpanCollapseClick={this.toggleSpanCollapse}
        />
      </div>
    );
  }
}
TraceTimelineViewer.propTypes = {
  xformedTrace: PropTypes.object,
  timeRangeFilter: PropTypes.array,
  textFilter: PropTypes.string,
};
