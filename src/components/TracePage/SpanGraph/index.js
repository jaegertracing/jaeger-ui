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
import PropTypes from 'prop-types';
import { window } from 'global';

import GraphTicks from './GraphTicks';
import CanvasSpanGraph from './CanvasSpanGraph';
import TickLabels from './TickLabels';
import Scrubber from './Scrubber';
import type { Trace } from '../../../types';

import './index.css';

const TIMELINE_TICK_INTERVAL = 4;

type SpanGraphProps = {
  height: number,
  trace: Trace,
  viewRange: [number, number],
};

type SpanGraphState = {
  currentlyDragging: ?string,
  leftBound: ?number,
  prevX: ?number,
  rightBound: ?number,
};

export default class SpanGraph extends React.Component<SpanGraphProps, SpanGraphState> {
  props: SpanGraphProps;
  state: SpanGraphState;

  _wrapper: ?HTMLElement;
  _publishIntervalID: ?number;

  static defaultProps = {
    height: 60,
  };

  static contextTypes = {
    updateTimeRangeFilter: PropTypes.func.isRequired,
  };

  constructor(props: SpanGraphProps) {
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
    this._publishIntervalID = undefined;
  }

  shouldComponentUpdate(nextProps: SpanGraphProps, nextState: SpanGraphState) {
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

  _setWrapper = function _setWrapper(elm: React.Node) {
    this._wrapper = elm;
  };

  _startDragging(boundName: string, { clientX }: SyntheticMouseEvent<any>) {
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

  _publishTimeRange = function _publishTimeRange() {
    const { currentlyDragging, leftBound, rightBound } = this.state;
    const { updateTimeRangeFilter } = this.context;
    clearTimeout(this._publishIntervalID);
    this._publishIntervalID = undefined;
    if (currentlyDragging) {
      updateTimeRangeFilter(leftBound, rightBound);
    }
  };

  _onMouseMove({ clientX }: SyntheticMouseEvent<any>) {
    const { currentlyDragging } = this.state;
    let { leftBound, rightBound } = this.state;
    if (!currentlyDragging || !this._wrapper) {
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
    if (this._publishIntervalID == null) {
      this._publishIntervalID = window.requestAnimationFrame(this._publishTimeRange);
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
              {leftInactive &&
                <rect x={0} y={0} height="100%" width={`${leftInactive}%`} className="SpanGraph--inactive" />}
              {rightInactive &&
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
                  onMouseDown={event => this._startDragging('leftBound', event)}
                />
              }
              {
                <Scrubber
                  id="trace-page-timeline__right-bound-handle"
                  position={rightBound || 1}
                  handleWidth={8}
                  handleHeight={30}
                  handleTopOffset={15}
                  onMouseDown={event => this._startDragging('rightBound', event)}
                />
              }
            </svg>
          </div>
        </div>
      </div>
    );
  }
}
