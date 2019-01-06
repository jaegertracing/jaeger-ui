// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from 'react';
import cx from 'classnames';

import type { DraggableBounds, DraggingUpdate } from '../../../../utils/DraggableManager';
import DraggableManager from '../../../../utils/DraggableManager';

import './TimelineColumnResizer.css';

type TimelineColumnResizerProps = {
  min: number,
  max: number,
  onChange: number => void,
  position: number,
};

type TimelineColumnResizerState = {
  dragPosition: ?number,
};

export default class TimelineColumnResizer extends React.PureComponent<
  TimelineColumnResizerProps,
  TimelineColumnResizerState
> {
  props: TimelineColumnResizerProps;
  state: TimelineColumnResizerState;

  _dragManager: DraggableManager;
  _rootElm: ?Element;

  constructor(props: TimelineColumnResizerProps) {
    super(props);
    this._dragManager = new DraggableManager({
      getBounds: this._getDraggingBounds,
      onDragEnd: this._handleDragEnd,
      onDragMove: this._handleDragUpdate,
      onDragStart: this._handleDragUpdate,
    });
    this._rootElm = undefined;
    this.state = {
      dragPosition: null,
    };
  }

  componentWillUnmount() {
    this._dragManager.dispose();
  }

  _setRootElm = (elm: ?Element) => {
    this._rootElm = elm;
  };

  _getDraggingBounds = (): DraggableBounds => {
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

  _handleDragUpdate = ({ value }: DraggingUpdate) => {
    this.setState({ dragPosition: value });
  };

  _handleDragEnd = ({ manager, value }: DraggingUpdate) => {
    manager.resetBounds();
    this.setState({ dragPosition: null });
    this.props.onChange(value);
  };

  render() {
    let left;
    let draggerStyle;
    let isDraggingCls = '';
    const { position } = this.props;
    const { dragPosition } = this.state;
    left = `${position * 100}%`;
    const gripStyle = { left };

    if (this._dragManager.isDragging() && this._rootElm && dragPosition != null) {
      isDraggingCls = cx({
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
      draggerStyle = gripStyle;
    }
    return (
      <div className={`TimelineColumnResizer ${isDraggingCls}`} ref={this._setRootElm}>
        <div className="TimelineColumnResizer--gripIcon" style={gripStyle} />
        <div
          aria-hidden
          className="TimelineColumnResizer--dragger"
          onMouseDown={this._dragManager.handleMouseDown}
          style={draggerStyle}
        />
      </div>
    );
  }
}
