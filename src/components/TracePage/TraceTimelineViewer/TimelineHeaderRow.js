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
import cx from 'classnames';

import Ticks from './Ticks';
import TimelineRow from './TimelineRow';

import './TimelineHeaderRow.css';

type TimelineHeaderRowProps = {
  endTime: number,
  nameColumnWidth: number,
  numTicks: number,
  onColummWidthChange: number => void,
  startTime: number,
};

type TimelineColumnResizerProps = {
  min: number,
  max: number,
  onChange: number => void,
  position: number,
};

type TimelineColumnResizerState = {
  currentDragPosition: ?number,
  rootX: ?number,
};

const LEFT_MOUSE_BUTTON = 0;

class TimelineColumnResizer extends React.PureComponent<
  TimelineColumnResizerProps,
  TimelineColumnResizerState
> {
  props: TimelineColumnResizerProps;
  state: TimelineColumnResizerState;
  _rootElm: ?Element;
  _isDragging: boolean;

  constructor(props) {
    super(props);
    this._rootElm = undefined;
    this._isDragging = false;
    this.state = {
      currentDragPosition: null,
      rootX: null,
    };
    this._setRootElm = this._setRootElm.bind(this);
    this._onDraggerMouseDown = this._onDraggerMouseDown.bind(this);
    this._onWindowMouseMove = this._onWindowMouseMove.bind(this);
    this._onWindowMouseUp = this._onWindowMouseUp.bind(this);
  }

  componentWillUnmount() {
    if (this._isDragging) {
      window.removeEventListener('mousemove', this._onWindowMouseMove);
      window.removeEventListener('mouseup', this._onWindowMouseUp);
      this._isDragging = false;
    }
  }

  _setRootElm = function _setRootElm(elm) {
    this._rootElm = elm;
  };

  _onDraggerMouseDown = function _onDraggerMouseDown({ button, clientX }) {
    if (this._isDragging || button !== LEFT_MOUSE_BUTTON || !this._rootElm) {
      return;
    }
    const rootX = this._rootElm.getBoundingClientRect().left;
    this.setState({
      rootX,
      currentDragPosition: clientX - rootX,
    });
    window.addEventListener('mousemove', this._onWindowMouseMove);
    window.addEventListener('mouseup', this._onWindowMouseUp);
    this._isDragging = true;
    if (document && document.body && document.body.style) {
      (document.body.style: any).userSelect = 'none';
    }
  };

  _onWindowMouseMove = function _onWindowMouseMove({ clientX }) {
    const { rootX } = this.state;
    this.setState({ rootX, currentDragPosition: clientX - (rootX || 0) });
  };

  _onWindowMouseUp = function _onWindowMouseUp({ clientX }) {
    window.removeEventListener('mousemove', this._onWindowMouseMove);
    window.removeEventListener('mouseup', this._onWindowMouseUp);
    if (document && document.body && document.body.style) {
      (document.body.style: any).userSelect = undefined;
    }
    this._isDragging = false;
    const { rootX } = this.state;
    this.setState({ rootX: null, currentDragPosition: null });
    const { min, max } = this.props;
    if (this._rootElm) {
      let value = (clientX - (rootX || 0)) / this._rootElm.clientWidth;
      if (value < min) {
        value = min;
      } else if (value > max) {
        value = max;
      }
      this.props.onChange(value);
    }
  };

  render() {
    let left;
    let draggerStyle;
    let draggerStateCls = '';
    if (this._isDragging && this._rootElm) {
      const { min, max, position } = this.props;
      const { currentDragPosition } = this.state;
      let newPosition = (currentDragPosition || 0) / this._rootElm.clientWidth;
      if (newPosition < min) {
        newPosition = min;
      } else if (newPosition > max) {
        newPosition = max;
      }
      left = `${newPosition * 100}%`;
      const draggLeft = `${Math.min(position, newPosition) * 100}%`;
      const width = `${Math.abs(position - newPosition) * 100}%`;
      draggerStyle = { width, left: draggLeft };
      draggerStateCls = cx({
        isDraggingLeft: newPosition < position,
        isDraggingRight: newPosition > position,
      });
    } else {
      const { position } = this.props;
      left = `${position * 100}%`;
      draggerStyle = { left };
    }
    return (
      <div className="TimelineColumnResizer" ref={this._setRootElm}>
        <div className={`TimelineColumnResizer--wrapper ${draggerStateCls}`} style={{ left }}>
          <div className="TimelineColumnResizer--gripIcon" />
          <div
            className="TimelineColumnResizer--dragger"
            onMouseDown={this._onDraggerMouseDown}
            style={draggerStyle}
          />
        </div>
      </div>
    );
  }
}

export default function TimelineHeaderRow(props: TimelineHeaderRowProps) {
  const { endTime, nameColumnWidth, numTicks, onColummWidthChange, startTime } = props;
  return (
    <TimelineRow className="TimelineHeaderRow">
      <TimelineRow.Cell width={nameColumnWidth}>
        <h3 className="TimelineHeaderRow--title">Service &amp; Operation</h3>
      </TimelineRow.Cell>
      <TimelineRow.Cell width={1 - nameColumnWidth}>
        <Ticks numTicks={numTicks} startTime={startTime} endTime={endTime} showLabels />
      </TimelineRow.Cell>
      <TimelineColumnResizer
        position={nameColumnWidth}
        onChange={onColummWidthChange}
        min={0.15}
        max={0.85}
      />
    </TimelineRow>
  );
}
