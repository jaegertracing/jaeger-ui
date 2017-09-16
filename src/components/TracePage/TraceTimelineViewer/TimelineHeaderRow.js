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
import _clamp from 'lodash/clamp';

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
  dragPosition: ?number,
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
      dragPosition: null,
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

  _getDraggedPosition(clientX: number, rootX: ?number = null) {
    if (!this._rootElm) {
      return null;
    }
    const { min, max } = this.props;
    const rx = rootX == null ? this.state.rootX : rootX;
    // pos is position of cursor in the horizontal portion of the bounding box,
    // in range [0, 1]
    const pos = (clientX - (rx || 0)) / this._rootElm.clientWidth;
    return _clamp(pos, min, max);
  }

  _onDraggerMouseDown = function _onDraggerMouseDown({ button, clientX }) {
    if (this._isDragging || button !== LEFT_MOUSE_BUTTON || !this._rootElm) {
      return;
    }
    const rootX = this._rootElm.getBoundingClientRect().left;
    const dragPosition = this._getDraggedPosition(clientX, rootX);
    this.setState({ rootX, dragPosition });
    window.addEventListener('mousemove', this._onWindowMouseMove);
    window.addEventListener('mouseup', this._onWindowMouseUp);
    this._isDragging = true;
    if (document && document.body && document.body.style) {
      (document.body.style: any).userSelect = 'none';
    }
  };

  _onWindowMouseMove = function _onWindowMouseMove({ clientX }) {
    const dragPosition = this._getDraggedPosition(clientX);
    this.setState({ ...this.state, dragPosition });
  };

  _onWindowMouseUp = function _onWindowMouseUp({ clientX }) {
    window.removeEventListener('mousemove', this._onWindowMouseMove);
    window.removeEventListener('mouseup', this._onWindowMouseUp);
    if (document && document.body && document.body.style) {
      (document.body.style: any).userSelect = undefined;
    }
    this._isDragging = false;
    const dragPosition = this._getDraggedPosition(clientX);
    if (dragPosition != null) {
      this.props.onChange(dragPosition);
    }
    this.setState({ rootX: null, dragPosition: null });
  };

  render() {
    let left;
    let draggerStyle;
    let draggerStateCls = '';
    const { dragPosition } = this.state;
    if (this._isDragging && this._rootElm && dragPosition != null) {
      const { position } = this.props;
      draggerStateCls = cx({
        isDraggingLeft: dragPosition < position,
        isDraggingRight: dragPosition > position,
      });
      left = `${dragPosition * 100}%`;
      // Draw a highlight from the current dragged position back to the original
      // position, e.g. highlight the change. Draw the highlight via `left` and
      // `right` css styles (simpler than using `width`).
      const draggerLeft = `${Math.min(position, dragPosition) * 100}%`;
      // subtract 1px for draggerRight to deal with the right border being off
      // by 1px when dragging left
      const draggerRight = `calc(${(1 - Math.max(position, dragPosition)) * 100}% - 1px)`;
      draggerStyle = { left: draggerLeft, right: draggerRight };
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
            aria-hidden
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
