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
import { window } from 'global';

import SpanGraph from '../SpanGraph';
import SpanGraphTickHeader from '../SpanGraph/SpanGraphTickHeader';
import tracePropTypes from '../../propTypes/trace';
import TimelineScrubber from './TimelineScrubber';

import {
  getTraceId,
  getSortedSpans,
  getTicksForTrace,
  getTraceTimestamp,
  getTraceEndTimestamp,
  getTraceDuration,
  getTraceSpans,
  getTraceSpanCount,
} from '../../selectors/trace';
import { getSpanTimestamp } from '../../selectors/span';
import { numberSortComparator } from '../../utils/sort';
import { getPercentageOfInterval } from '../../utils/date';

const TIMELINE_TICK_INTERVAL = 5;
const TIMELINE_TICK_WIDTH = 2;
const TIMELINE_TRACE_SORT = {
  dir: 1,
  selector: getSpanTimestamp,
  comparator: numberSortComparator,
};

export default class TracePageTimeline extends Component {
  static get propTypes() {
    return {
      trace: tracePropTypes,
      height: PropTypes.number.isRequired,
    };
  }

  static get defaultProps() {
    return {
      height: 50,
    };
  }

  static get contextTypes() {
    return {
      timeRangeFilter: PropTypes.arrayOf(PropTypes.number).isRequired,
      updateTimeRangeFilter: PropTypes.func.isRequired,
    };
  }

  constructor(props) {
    super(props);
    this.state = { currentlyDragging: null, prevX: null };
  }

  shouldComponentUpdate(
    { trace: newTrace },
    { currentlyDragging: newCurrentlyDragging },
    { timeRangeFilter: newTimeRangeFilter }
  ) {
    const { trace } = this.props;
    const { currentlyDragging } = this.state;
    const { timeRangeFilter } = this.context;
    const leftBound = timeRangeFilter[0];
    const rightBound = timeRangeFilter[1];
    const newLeftBound = newTimeRangeFilter[0];
    const newRightBound = newTimeRangeFilter[1];

    return (
      getTraceId(trace) !== getTraceId(newTrace) ||
      leftBound !== newLeftBound ||
      rightBound !== newRightBound ||
      currentlyDragging !== newCurrentlyDragging
    );
  }

  onMouseMove({ clientX }) {
    const { trace } = this.props;
    const { prevX, currentlyDragging } = this.state;
    const { timeRangeFilter, updateTimeRangeFilter } = this.context;

    if (!currentlyDragging) {
      return;
    }

    let leftBound = timeRangeFilter[0];
    let rightBound = timeRangeFilter[1];

    const deltaX = (clientX - prevX) / this.svg.clientWidth;
    const timestamp = getTraceTimestamp(trace);
    const endTimestamp = getTraceEndTimestamp(trace);
    const duration = getTraceDuration(this.props.trace);
    const prevValue = { leftBound, rightBound }[currentlyDragging];
    const newValue = prevValue + duration * deltaX;

    // enforce the edges of the graph
    switch (currentlyDragging) {
      case 'leftBound':
        leftBound = Math.max(timestamp, newValue);
        break;
      case 'rightBound':
        rightBound = Math.min(endTimestamp, newValue);
        break;
      /* istanbul ignore next */ default:
        break;
    }

    this.setState({ prevX: clientX });
    if (leftBound <= rightBound) {
      updateTimeRangeFilter(leftBound, rightBound);
    }
  }

  startDragging(boundName, { clientX }) {
    this.setState({ currentlyDragging: boundName, prevX: clientX });

    const mouseMoveHandler = (...args) => this.onMouseMove(...args);
    const mouseUpHandler = () => {
      this.stopDragging();
      window.removeEventListener('mouseup', mouseUpHandler);
      window.removeEventListener('mousemove', mouseMoveHandler);
    };

    window.addEventListener('mouseup', mouseUpHandler);
    window.addEventListener('mousemove', mouseMoveHandler);
  }

  stopDragging() {
    this.setState({ currentlyDragging: null, prevX: null });
  }

  render() {
    const { trace, height } = this.props;
    const { currentlyDragging } = this.state;
    const { timeRangeFilter } = this.context;
    const leftBound = timeRangeFilter[0];
    const rightBound = timeRangeFilter[1];

    if (!trace) {
      return <div />;
    }

    const ticks = getTicksForTrace({
      trace,
      interval: TIMELINE_TICK_INTERVAL,
      width: TIMELINE_TICK_WIDTH,
    });

    const initialTimestamp = getTraceTimestamp(trace);
    const traceDuration = getTraceDuration(trace);

    let leftInactive;
    if (leftBound) {
      leftInactive = getPercentageOfInterval(leftBound, initialTimestamp, traceDuration);
    }

    let rightInactive;
    if (rightBound) {
      rightInactive = 100 - getPercentageOfInterval(rightBound, initialTimestamp, traceDuration);
    }

    return (
      <div className="trace-page-timeline condensed-span-graphs">
        <div className="trace-page-timeline--tick-container">
          <SpanGraphTickHeader trace={trace} ticks={ticks} />
        </div>
        <div className="trace-page-timeline__graph">
          <svg
            width="100%"
            height={height}
            ref={/* istanbul ignore next */ c => {
              this.svg = c;
            }}
            style={{
              cursor: currentlyDragging ? 'ew-resize' : 'auto',
              transformOrigin: '0 0',
              borderBottom: '1px solid #E5E5E4',
            }}
          >
            {leftInactive > 0 &&
              <rect
                x={0}
                y={0}
                height="100%"
                width={`${leftInactive}%`}
                className="trace-page-timeline__graph--inactive"
              />}
            {rightInactive > 0 &&
              <rect
                x={`${100 - rightInactive}%`}
                y={0}
                height="100%"
                width={`${rightInactive}%`}
                className="trace-page-timeline__graph--inactive"
              />}
            <SpanGraph
              trace={trace}
              spans={getSortedSpans({
                trace,
                spans: getTraceSpans(trace),
                sort: TIMELINE_TRACE_SORT,
              })}
              rowPadding={0}
              rowHeight={height / getTraceSpanCount(trace)}
              ticks={ticks}
            />
            {leftBound &&
              <TimelineScrubber
                id="trace-page-timeline__left-bound-handle"
                trace={trace}
                timestamp={leftBound}
                handleWidth={8}
                handleHeight={30}
                handleTopOffset={10}
                onMouseDown={(...args) => this.startDragging('leftBound', ...args)}
              />}
            {rightBound &&
              <TimelineScrubber
                id="trace-page-timeline__right-bound-handle"
                trace={trace}
                timestamp={rightBound}
                handleWidth={8}
                handleHeight={30}
                handleTopOffset={10}
                onMouseDown={(...args) => this.startDragging('rightBound', ...args)}
              />}
          </svg>
        </div>
      </div>
    );
  }
}
