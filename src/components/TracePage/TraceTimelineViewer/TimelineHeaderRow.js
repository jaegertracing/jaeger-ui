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
import type { DraggableBounds, DraggingUpdate } from '../../../utils/DraggableManager';
import DraggableManager from '../../../utils/DraggableManager';

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
};

class TimelineColumnResizer extends React.PureComponent<
  TimelineColumnResizerProps,
  TimelineColumnResizerState
> {
  props: TimelineColumnResizerProps;
  state: TimelineColumnResizerState;

  _rootElm: ?Element;
  _dragManager: DraggableManager;

  constructor(props) {
    super(props);
    this._setRootElm = this._setRootElm.bind(this);
    this._getDraggingBounds = this._getDraggingBounds.bind(this);
    this._handleDragUpdate = this._handleDragUpdate.bind(this);
    this._handleDragEnd = this._handleDragEnd.bind(this);

    this._rootElm = undefined;
    this._dragManager = new DraggableManager(this._getDraggingBounds);
    this._dragManager.onDragStart = this._handleDragUpdate;
    this._dragManager.onDragMove = this._handleDragUpdate;
    this._dragManager.onDragEnd = this._handleDragEnd;
    this.state = {
      dragPosition: null,
    };
  }

  componentWillUnmount() {
    this._dragManager.dispose();
  }

  _setRootElm = function _setRootElm(elm) {
    this._rootElm = elm;
  };

  _getDraggingBounds = function _getDraggingBounds(): DraggableBounds {
    if (!this._rootElm) {
      throw new Error('invalid state');
    }
    const { left: clientXLeft, width } = this._rootElm.getBoundingClientRect();
    const { min, max } = this.props;
    return {
      clientXLeft,
      width,
      maxValue: max,
      minValue: min,
    };
  };

  _handleDragUpdate = function _handleDragUpdate({ value }: DraggingUpdate) {
    this.setState({ dragPosition: value });
  };

  _handleDragEnd = function _handleDragEnd({ manager, value }: DraggingUpdate) {
    manager.resetBounds();
    this.setState({ dragPosition: null });
    this.props.onChange(value);
  };

  render() {
    let left;
    let draggerStyle;
    let draggerStateCls = '';
    const { dragPosition } = this.state;
    if (this._dragManager.isDragging() && this._rootElm && dragPosition != null) {
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
            onMouseDown={this._dragManager.handleMouseDown}
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
