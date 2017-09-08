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
import { window } from 'global';
import PropTypes from 'prop-types';

import SpanGraph from './SpanGraph';
import SpanGraphTickHeader from './SpanGraph/SpanGraphTickHeader';
import TimelineScrubber from './TimelineScrubber';
import { getPercentageOfInterval } from '../../utils/date';

const TIMELINE_TICK_INTERVAL = 4;

export default class TraceSpanGraph extends Component {
  static get propTypes() {
    return {
      trace: PropTypes.object,
      height: PropTypes.number.isRequired,
    };
  }

  static get defaultProps() {
    return {
      height: 60,
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
      trace.traceID !== newTrace.traceID ||
      leftBound !== newLeftBound ||
      rightBound !== newRightBound ||
      currentlyDragging !== newCurrentlyDragging
    );
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
    const prevValue = { leftBound, rightBound }[currentlyDragging];
    const newValue = prevValue + trace.duration * deltaX;

    // enforce the edges of the graph
    switch (currentlyDragging) {
      case 'leftBound':
        leftBound = Math.max(trace.startTime, newValue);
        break;
      case 'rightBound':
        rightBound = Math.min(trace.endTime, newValue);
        break;
      /* istanbul ignore next */ default:
        break;
    }

    this.setState({ prevX: clientX });
    if (leftBound <= rightBound) {
      updateTimeRangeFilter(leftBound, rightBound);
    }
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

    let leftInactive;
    if (leftBound) {
      leftInactive = getPercentageOfInterval(leftBound, trace.startTime, trace.duration);
    }

    let rightInactive;
    if (rightBound) {
      rightInactive = 100 - getPercentageOfInterval(rightBound, trace.startTime, trace.duration);
    }

    return (
      <div>
        <div className="trace-page-timeline--tick-container">
          <SpanGraphTickHeader numTicks={TIMELINE_TICK_INTERVAL} duration={trace.duration} />
        </div>
        <div>
          <svg
            height={height}
            className={`trace-page-timeline__graph ${currentlyDragging ? 'is-dragging' : ''}`}
            ref={/* istanbul ignore next */ c => {
              this.svg = c;
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
              valueWidth={trace.duration}
              numTicks={TIMELINE_TICK_INTERVAL}
              items={trace.spans.map(span => ({
                valueOffset: span.relativeStartTime,
                valueWidth: span.duration,
                serviceName: span.process.serviceName,
              }))}
            />
            {leftBound &&
              <TimelineScrubber
                id="trace-page-timeline__left-bound-handle"
                trace={trace}
                timestamp={leftBound}
                handleWidth={8}
                handleHeight={30}
                handleTopOffset={15}
                onMouseDown={(...args) => this.startDragging('leftBound', ...args)}
              />}
            {rightBound &&
              <TimelineScrubber
                id="trace-page-timeline__right-bound-handle"
                trace={trace}
                timestamp={rightBound}
                handleWidth={8}
                handleHeight={30}
                handleTopOffset={15}
                onMouseDown={(...args) => this.startDragging('rightBound', ...args)}
              />}
          </svg>
        </div>
      </div>
    );
  }
}
