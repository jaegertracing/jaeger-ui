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

import React, { PropTypes } from 'react';
import { Dropdown, Menu } from 'semantic-ui-react';

import tracePropTypes from '../../propTypes/trace';
import { formatDatetime } from '../../utils/date';

import {
  formatDurationForTrace,
  getTraceDepth,
  getTraceDuration,
  getTraceName,
  getTraceServiceCount,
  getTraceSpanCount,
  getTraceTimestamp,
} from '../../selectors/trace';

function MoreTraceOptionsDropdown({ traceID }) {
  return (
    <Menu>
      <Dropdown text="View Options" className="item">
        <Dropdown.Menu>
          <Dropdown.Item>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={`/api/traces/${traceID}`}
            >
              View Trace JSON
            </a>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </Menu>
  );
}

MoreTraceOptionsDropdown.propTypes = {
  traceID: PropTypes.string,
};

export const HEADER_ITEMS = [
  {
    key: 'timestamp',
    title: 'Trace Start',
    renderer: trace => formatDatetime(getTraceTimestamp(trace)),
  },
  {
    key: 'duration',
    title: 'Duration',
    renderer: trace =>
      formatDurationForTrace({ trace, duration: getTraceDuration(trace) }),
  },
  {
    key: 'service-count',
    title: 'Services',
    renderer: trace => getTraceServiceCount(trace),
  },
  {
    key: 'depth',
    title: 'Depth',
    renderer: trace => getTraceDepth(trace),
  },
  {
    key: 'span-count',
    title: 'Total Spans',
    renderer: trace => getTraceSpanCount(trace),
  },
];

export default function TracePageHeader(
  { trace, slimView = false, onSlimViewClicked = noop => noop },
  { updateTextFilter, textFilter }
) {
  if (!trace) {
    return <div />;
  }

  return (
    <header className="trace-page-header mb2">
      <div className="flex">
        <div className="flex-auto">
          <h2>
            <a onClick={() => onSlimViewClicked()}>
              <i
                className={
                  `ui icon angle double ${slimView ? 'right' : 'down'}`
                }
                style={{ float: 'none' }}
              />
            </a>
            {getTraceName(trace)}
          </h2>
        </div>
        <div className="inline-block mr1">
          <MoreTraceOptionsDropdown traceID={trace.traceID} />
        </div>
        <div className="inline-block">
          <div className="ui input">
            <input
              id="trace-page__text-filter"
              type="text"
              defaultValue={textFilter}
              placeholder="Search..."
              onChange={({ target: { value } }) => updateTextFilter(value)}
            />
          </div>
        </div>
      </div>
      {!slimView &&
        <div>
          {HEADER_ITEMS.map(({ renderer, title, ...itemProps }) => (
            <div className="inline-block mr1" {...itemProps}>
              <strong>{title}:{' '}</strong>
              <span>{renderer(trace)}</span>
            </div>
          ))}
        </div>}
    </header>
  );
}

TracePageHeader.propTypes = {
  trace: tracePropTypes,
  slimView: PropTypes.bool,
  onSlimViewClicked: PropTypes.func,
};

TracePageHeader.contextTypes = {
  textFilter: PropTypes.string.isRequired,
  updateTextFilter: PropTypes.func.isRequired,
};
