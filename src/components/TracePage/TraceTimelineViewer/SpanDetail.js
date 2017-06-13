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
import { withState } from 'recompose';

import jsonMarkup from 'json-markup';
import _ from 'lodash';
import { formatDuration } from './utils';

const collapseEnhancer = withState('open', 'onToggleOpen', false);

function CollapsePanel(props) {
  const {
    header,
    onToggleOpen,
    children,
    open,
  } = props;
  return (
    <div>
      <a style={{ cursor: 'pointer' }} onClick={() => onToggleOpen(!open)}>
        <i className={`${open ? 'minus' : 'plus'} square outline icon`} />
        {header}
      </a>
      {open &&
        <div>
          {children}
        </div>}
    </div>
  );
}
CollapsePanel.propTypes = {
  header: PropTypes.element.isRequired,
  onToggleOpen: PropTypes.func.isRequired,
  children: PropTypes.element.isRequired,
  open: PropTypes.bool.isRequired,
};
const CollapsePanelStatefull = collapseEnhancer(CollapsePanel);

function ExpandableDataTable(props) {
  const { data, label, open, onToggleOpen } = props;
  return (
    <div className="my1 overflow-hidden" style={{ textOverflow: 'ellipsis' }}>
      <div
        onClick={() => onToggleOpen(!open)}
        className="overflow-hidden nowrap inline"
        style={{
          cursor: 'pointer',
          textOverflow: 'ellipsis',
        }}
      >
        <span className="bold">
          <i className={`${open ? 'minus' : 'plus'} square outline icon`} />
          {label}
          :
        </span>
        {!open &&
          <span>
            {data.map(row => (
              <span className="px1">
                <span style={{ color: 'gray' }}>{row.key}=</span>
                {row.value.toString()}
              </span>
            ))}
          </span>}
      </div>
      {open &&
        <table className="ui very striped compact table">
          <tbody>
            {data.map(row => {
              let json;
              try {
                json = JSON.parse(row.value);
              } catch (e) {
                json = row.value;
              }
              return (
                <tr key={row.key}>
                  <td
                    width="150"
                    style={{ color: 'gray', verticalAlign: 'top' }}
                  >
                    {row.key}
                  </td>
                  <td>
                    <div
                      className="overflow-scroll"
                      style={{ maxHeight: 300 }}
                      dangerouslySetInnerHTML={{ __html: jsonMarkup(json) }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>}
    </div>
  );
}

ExpandableDataTable.defaultProps = {
  open: false,
};
ExpandableDataTable.propTypes = {
  open: PropTypes.bool,
  data: PropTypes.shape({
    key: PropTypes.string,
    value: PropTypes.value,
  }),
  label: PropTypes.string,
  onToggleOpen: PropTypes.func,
};
const ExpandableDataTableStatefull = collapseEnhancer(ExpandableDataTable);

function Logs({ logs, traceStartTime, open, onToggleOpen }) {
  return (
    <div className="ui segment">
      <div className="ui top attached label">
        <a onClick={() => onToggleOpen(!open)} style={{ opacity: 1 }}>
          <i
            className={`${open ? 'down' : 'right'} angle double icon`}
            style={{ cursor: 'pointer', float: 'none' }}
          />
          Logs ({logs.length})
        </a>
      </div>
      {open &&
        <div>
          {_.sortBy(logs, 'timestamp').map(log => (
            <ExpandableDataTableStatefull
              data={log.fields || []}
              label={`${formatDuration(log.timestamp - traceStartTime)}`}
            />
          ))}
          <div style={{ color: 'gray' }}>
            <small>
              **Log timestamps are relative to the start time of the full trace.
            </small>
          </div>
        </div>}
    </div>
  );
}

Logs.propTypes = {
  open: PropTypes.bool,
  onToggleOpen: PropTypes.func,
  logs: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.number,
      fields: PropTypes.array,
    })
  ),
  traceStartTime: PropTypes.number,
};

const LogsStatefull = withState('open', 'onToggleOpen', false)(Logs);

export default function SpanDetail(props) {
  const { span, trace } = props;
  return (
    <div>
      <div>
        <h3 className="mb1">{span.operationName}</h3>
        <div>
          <div className="inline-block mr1">
            <strong>Service: </strong>
            <span>{span.process.serviceName}</span>
          </div>
          <div className="inline-block mr1">
            <strong>Duration: </strong>
            <span>{formatDuration(span.duration)}</span>
          </div>
          <div className="inline-block mr1">
            <strong>Start Time: </strong>
            <span>{formatDuration(span.relativeStartTime)}</span>
          </div>
        </div>
        <hr />
      </div>
      <div>
        <div>
          <ExpandableDataTableStatefull data={span.tags} label="Tags" />
          {span.process &&
            span.process.tags &&
            <ExpandableDataTableStatefull
              data={span.process.tags || []}
              label="Process"
            />}
        </div>
        {span.logs &&
          span.logs.length > 0 &&
          <LogsStatefull logs={span.logs} traceStartTime={trace.startTime} />}
        <div className="h6">
          <CollapsePanelStatefull header="Debug Info">
            <table className="ui very striped compact table">
              <tr>
                <td>spanID</td>
                <td>{span.spanID}</td>
              </tr>
            </table>
          </CollapsePanelStatefull>
        </div>
      </div>
    </div>
  );
}
SpanDetail.propTypes = {
  span: PropTypes.obj,
  trace: PropTypes.obj,
};
