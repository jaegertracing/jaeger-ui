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
import React from 'react';

import TimelineRow from './TimelineRow';
import SpanTreeOffset from './SpanTreeOffset';
import SpanBar from './SpanBar';
import Ticks from './Ticks';

export default function SpanBarRow(props) {
  const {
    className,
    color,
    depth,
    isChildrenExpanded,
    isDetailExapnded,
    isFilteredOut,
    isParent,
    label,
    onDetailToggled,
    onChildrenToggled,
    operationName,
    rpc,
    serviceName,
    showErrorIcon,
    ticks,
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

  let title = serviceName;
  if (rpc) {
    title += ` → ${rpc.serviceName}::${rpc.operationName}`;
  } else {
    title += `::${operationName}`;
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
      <TimelineRow.Left className="span-name-column">
        <div className="overflow-hidden nowrap" style={{ textOverflow: 'ellipsis' }} title={title}>
          <SpanTreeOffset
            level={depth + 1}
            hasChildren={isParent}
            childrenVisible={isChildrenExpanded}
            onClick={onChildrenToggled}
          />
          <a
            tabIndex="0"
            className="span-name"
            style={{
              outline: 0,
              color: 'black',
              borderLeft: `4px solid ${color}`,
              cursor: 'pointer',
              display: isDetailExapnded ? 'inline-block' : 'inline',
            }}
            onClick={onDetailToggled}
          >
            <span
              className="p1"
              style={{
                fontSize: '1.05em',
                fontWeight: isParent && !isChildrenExpanded ? 'bold' : undefined,
                fontStyle: isParent && !isChildrenExpanded ? 'italic' : undefined,
              }}
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
      </TimelineRow.Left>
      <TimelineRow.Right className="span-view" style={{ cursor: 'pointer' }} onClick={onDetailToggled}>
        <Ticks ticks={ticks} />
        <SpanBar
          rpc={rpc}
          viewStart={viewStart}
          viewEnd={viewEnd}
          color={color}
          shortLabel={label}
          longLabel={longLabel}
          hintSide={hintSide}
        />
      </TimelineRow.Right>
    </TimelineRow>
  );
}

SpanBarRow.propTypes = {
  className: PropTypes.string,
  color: PropTypes.string.isRequired,
  depth: PropTypes.number.isRequired,
  isChildrenExpanded: PropTypes.bool.isRequired,
  isDetailExapnded: PropTypes.bool.isRequired,
  isFilteredOut: PropTypes.bool.isRequired,
  isParent: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onDetailToggled: PropTypes.func.isRequired,
  onChildrenToggled: PropTypes.func.isRequired,
  operationName: PropTypes.string.isRequired,
  rpc: PropTypes.shape({
    viewStart: PropTypes.number,
    viewEnd: PropTypes.number,
    color: PropTypes.string,
    operationName: PropTypes.string,
    serviceName: PropTypes.string,
  }),
  serviceName: PropTypes.string.isRequired,
  showErrorIcon: PropTypes.bool.isRequired,
  ticks: PropTypes.arrayOf(PropTypes.number).isRequired,
  viewEnd: PropTypes.number.isRequired,
  viewStart: PropTypes.number.isRequired,
};

SpanBarRow.defaultProps = {
  className: '',
  rpc: null,
};
