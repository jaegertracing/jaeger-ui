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

import React from 'react';
import PropTypes from 'prop-types';

import TimelineRow from './TimelineRow';
import SpanTreeOffset from './SpanTreeOffset';
import SpanBar from './SpanBar';
import Ticks from './Ticks';

import './SpanBarRow.css';

export default function SpanBarRow(props) {
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
    onDetailToggled,
    onChildrenToggled,
    numTicks,
    operationName,
    rpc,
    serviceName,
    showErrorIcon,
    viewEnd,
    viewStart,
  } = props;

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
            onClick={onChildrenToggled}
          />
          <a
            className={`span-name ${isDetailExapnded ? 'is-detail-expanded' : ''}`}
            aria-checked={isDetailExapnded}
            onClick={onDetailToggled}
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
        onClick={onDetailToggled}
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

SpanBarRow.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string.isRequired,
  columnDivision: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  isChildrenExpanded: PropTypes.bool.isRequired,
  isDetailExapnded: PropTypes.bool.isRequired,
  isFilteredOut: PropTypes.bool.isRequired,
  isParent: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onDetailToggled: PropTypes.func.isRequired,
  onChildrenToggled: PropTypes.func.isRequired,
  operationName: PropTypes.string.isRequired,
  numTicks: PropTypes.number.isRequired,
  rpc: PropTypes.shape({
    viewStart: PropTypes.number,
    viewEnd: PropTypes.number,
    color: PropTypes.string,
    operationName: PropTypes.string,
    serviceName: PropTypes.string,
  }),
  serviceName: PropTypes.string.isRequired,
  showErrorIcon: PropTypes.bool.isRequired,
  viewEnd: PropTypes.number.isRequired,
  viewStart: PropTypes.number.isRequired,
};

SpanBarRow.defaultProps = {
  className: '',
  rpc: null,
};
