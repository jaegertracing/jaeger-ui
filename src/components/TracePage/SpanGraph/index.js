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

import GraphTicks from './GraphTicks';
import CanvasSpanGraph from './CanvasSpanGraph';
import TickLabels from './TickLabels';
import Scrubber from './Scrubber';

import './index.css';

const TIMELINE_TICK_INTERVAL = 4;

export default class SpanGraph extends Component {
  static get propTypes() {
    return {
      height: PropTypes.number.isRequired,
      trace: PropTypes.object,
      viewRange: PropTypes.arrayOf(PropTypes.number).isRequired,
    };
  }

  static get defaultProps() {
    return {
      height: 60,
    };
  }

  static get contextTypes() {
    return {
      updateTimeRangeFilter: PropTypes.func.isRequired,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      currentlyDragging: null,
      leftBound: null,
      prevX: null,
      rightBound: null,
    };
    this._wrapper = undefined;
    this._setWrapper = this._setWrapper.bind(this);
    this._publishTimeRange = this._publishTimeRange.bind(this);
    this.publishIntervalID = undefined;
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { trace: newTrace, viewRange: newViewRange } = nextProps;
    const {
      currentlyDragging: newCurrentlyDragging,
      leftBound: newLeftBound,
      rightBound: newRightBound,
    } = nextState;
    const { trace, viewRange } = this.props;
    const { currentlyDragging, leftBound, rightBound } = this.state;

    return (
      trace.traceID !== newTrace.traceID ||
      viewRange[0] !== newViewRange[0] ||
      viewRange[1] !== newViewRange[1] ||
      currentlyDragging !== newCurrentlyDragging ||
      leftBound !== newLeftBound ||
      rightBound !== newRightBound
    );
  }

  _setWrapper(elm) {
    this._wrapper = elm;
  }

  _startDragging(boundName, { clientX }) {
    const { viewRange } = this.props;
    const [leftBound, rightBound] = viewRange;

    this.setState({ currentlyDragging: boundName, prevX: clientX, leftBound, rightBound });

    const mouseMoveHandler = (...args) => this._onMouseMove(...args);
    const mouseUpHandler = () => {
      this._stopDragging();
      window.removeEventListener('mouseup', mouseUpHandler);
      window.removeEventListener('mousemove', mouseMoveHandler);
    };

    window.addEventListener('mouseup', mouseUpHandler);
    window.addEventListener('mousemove', mouseMoveHandler);
  }

  _stopDragging() {
    this._publishTimeRange();
    this.setState({ currentlyDragging: null, prevX: null });
  }

  _publishTimeRange() {
    const { currentlyDragging, leftBound, rightBound } = this.state;
    const { updateTimeRangeFilter } = this.context;
    clearTimeout(this.publishIntervalID);
    this.publishIntervalID = undefined;
    if (currentlyDragging) {
      updateTimeRangeFilter(leftBound, rightBound);
    }
  }

  _onMouseMove({ clientX }) {
    const { currentlyDragging } = this.state;
    let { leftBound, rightBound } = this.state;
    if (!currentlyDragging) {
      return;
    }
    const newValue = clientX / this._wrapper.clientWidth;
    switch (currentlyDragging) {
      case 'leftBound':
        leftBound = Math.max(0, newValue);
        break;
      case 'rightBound':
        rightBound = Math.min(1, newValue);
        break;
      default:
        break;
    }
    this.setState({ prevX: clientX, leftBound, rightBound });
    if (this.publishIntervalID == null) {
      this.publishIntervalID = window.requestAnimationFrame(this._publishTimeRange);
    }
  }

  render() {
    const { height, trace, viewRange } = this.props;
    if (!trace) {
      return <div />;
    }
    const { currentlyDragging } = this.state;
    let { leftBound, rightBound } = this.state;
    if (!currentlyDragging) {
      leftBound = viewRange[0];
      rightBound = viewRange[1];
    }
    let leftInactive;
    if (leftBound) {
      leftInactive = leftBound * 100;
    }
    let rightInactive;
    if (rightBound) {
      rightInactive = 100 - rightBound * 100;
    }
    return (
      <div>
        <TickLabels numTicks={TIMELINE_TICK_INTERVAL} duration={trace.duration} />
        <div className="relative" ref={this._setWrapper}>
          <CanvasSpanGraph
            valueWidth={trace.duration}
            items={trace.spans.map(span => ({
              valueOffset: span.relativeStartTime,
              valueWidth: span.duration,
              serviceName: span.process.serviceName,
            }))}
          />
          <div className="SpanGraph--zlayer">
            <svg height={height} className={`SpanGraph--graph ${currentlyDragging ? 'is-dragging' : ''}`}>
              {leftInactive > 0 &&
                <rect x={0} y={0} height="100%" width={`${leftInactive}%`} className="SpanGraph--inactive" />}
              {rightInactive > 0 &&
                <rect
                  x={`${100 - rightInactive}%`}
                  y={0}
                  height="100%"
                  width={`${rightInactive}%`}
                  className="SpanGraph--inactive"
                />}
              <GraphTicks
                valueWidth={trace.duration}
                numTicks={TIMELINE_TICK_INTERVAL}
                items={trace.spans.map(span => ({
                  valueOffset: span.relativeStartTime,
                  valueWidth: span.duration,
                  serviceName: span.process.serviceName,
                }))}
              />
              {
                <Scrubber
                  id="trace-page-timeline__left-bound-handle"
                  position={leftBound || 0}
                  handleWidth={8}
                  handleHeight={30}
                  handleTopOffset={15}
                  onMouseDown={(...args) => this._startDragging('leftBound', ...args)}
                />
              }
              {
                <Scrubber
                  id="trace-page-timeline__right-bound-handle"
                  position={rightBound || 1}
                  handleWidth={8}
                  handleHeight={30}
                  handleTopOffset={15}
                  onMouseDown={(...args) => this._startDragging('rightBound', ...args)}
                />
              }
            </svg>
          </div>
        </div>
      </div>
    );
  }
}
