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

import TimelineRow from './TimelineRow';
import SpanTreeOffset from './SpanTreeOffset';
import SpanBar from './SpanBar';
import Ticks from './Ticks';

import './SpanBarRow.css';

type SpanBarRowProps = {
  className: string,
  color: string,
  columnDivision: number,
  depth: number,
  isChildrenExpanded: boolean,
  isDetailExapnded: boolean,
  isFilteredOut: boolean,
  isParent: boolean,
  label: string,
  onDetailToggled: string => void,
  onChildrenToggled: string => void,
  operationName: string,
  numTicks: number,
  rpc: ?{
    viewStart: number,
    viewEnd: number,
    color: string,
    operationName: string,
    serviceName: string,
  },
  serviceName: string,
  showErrorIcon: boolean,
  spanID: string,
  viewEnd: number,
  viewStart: number,
};

/**
 * This was originally a stateless function, but changing to a PureComponent
 * reduced the render time of expanding a span row detail by ~50%. This is
 * even true in the case where the stateless function has the same prop types as
 * this class and arrow functions are created in the stateless function as
 * handlers to the onClick props. E.g. for now, the PureComponent is more
 * performance than the stateless function.
 */
export default class SpanBarRow extends React.PureComponent<SpanBarRowProps> {
  props: SpanBarRowProps;

  static defaultProps = {
    className: '',
    rpc: null,
  };

  constructor(props: SpanBarRowProps) {
    super(props);
    this._detailToggle = this._detailToggle.bind(this);
    this._childrenToggle = this._childrenToggle.bind(this);
  }

  _detailToggle = function _detailToggle() {
    this.props.onDetailToggled(this.props.spanID);
  };

  _childrenToggle = function _childrenToggle() {
    this.props.onChildrenToggled(this.props.spanID);
  };

  render() {
    const {
      className,
      color,
      columnDivision,
      depth,
      isChildrenExpanded,
      isDetailExapnded,
      isFilteredOut,
      isParent,
      label,
      numTicks,
      operationName,
      rpc,
      serviceName,
      showErrorIcon,
      viewEnd,
      viewStart,
    } = this.props;

    const labelDetail = `${serviceName}::${operationName}`;
    let longLabel;
    let hintSide;
    if (viewStart > 1 - viewEnd) {
      longLabel = `${labelDetail} | ${label}`;
      hintSide = 'left';
    } else {
      longLabel = `${label} | ${labelDetail}`;
      hintSide = 'right';
    }
    return (
      <TimelineRow
        className={`
          span-row
          ${className || ''}
          ${isDetailExapnded ? 'is-expanded' : ''}
          ${isFilteredOut ? 'is-filtered-out' : ''}
        `}
      >
        <TimelineRow.Cell className="span-name-column" width={columnDivision}>
          <div className="span-name-wrapper">
            <SpanTreeOffset
              level={depth + 1}
              hasChildren={isParent}
              childrenVisible={isChildrenExpanded}
              onClick={this._childrenToggle}
            />
            <a
              className={`span-name ${isDetailExapnded ? 'is-detail-expanded' : ''}`}
              aria-checked={isDetailExapnded}
              onClick={this._detailToggle}
              role="switch"
              style={{ borderColor: color }}
              tabIndex="0"
            >
              <span
                className={`span-svc-name ${isParent && !isChildrenExpanded ? 'is-children-collapsed' : ''}`}
              >
                {showErrorIcon && <i aria-hidden="true" className="icon warning circle red" />}
                {serviceName}{' '}
                {rpc &&
                  <span>
                    <i className="long arrow right icon" style={{ float: 'none' }} />
                    <i className="circle icon" style={{ color: rpc.color }} />
                    {rpc.serviceName}
                  </span>}
              </span>
              <span className="endpoint-name mb1 pl1 h6">
                {rpc ? rpc.operationName : operationName}
              </span>
            </a>
          </div>
        </TimelineRow.Cell>
        <TimelineRow.Cell
          className="span-view"
          style={{ cursor: 'pointer' }}
          width={1 - columnDivision}
          onClick={this._detailToggle}
        >
          <Ticks numTicks={numTicks} />
          <SpanBar
            rpc={rpc}
            viewStart={viewStart}
            viewEnd={viewEnd}
            color={color}
            shortLabel={label}
            longLabel={longLabel}
            hintSide={hintSide}
          />
        </TimelineRow.Cell>
      </TimelineRow>
    );
  }
}
