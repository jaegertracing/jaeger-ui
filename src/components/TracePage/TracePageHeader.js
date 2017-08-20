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
import { Dropdown, Menu } from 'semantic-ui-react';

import { formatDatetime, formatDuration } from '../../utils/date';

export const HEADER_ITEMS = [
  {
    key: 'timestamp',
    title: 'Trace Start',
    renderer: props => formatDatetime(props.timestampMs * 1000),
  },
  {
    key: 'duration',
    title: 'Duration',
    renderer: props => formatDuration(props.durationMs * 1000),
  },
  {
    key: 'service-count',
    title: 'Services',
    propName: 'numServices',
  },
  {
    key: 'depth',
    title: 'Depth',
    propName: 'maxDepth',
  },
  {
    key: 'span-count',
    title: 'Total Spans',
    propName: 'numSpans',
  },
];

export default function TracePageHeader(props, context) {
  const { traceID, name, slimView, onSlimViewClicked } = props;
  const { updateTextFilter, textFilter } = context;

  if (!traceID) {
    return null;
  }

  return (
    <header className="mb1">
      <div className="flex">
        <div className="flex-auto">
          <h2>
            <a onClick={onSlimViewClicked}>
              <i
                className={`ui icon angle double ${slimView ? 'right' : 'down'}`}
                style={{ float: 'none' }}
              />
            </a>
            {name}
          </h2>
        </div>
        <div className="inline-block mr1">
          <Menu>
            <Dropdown text="View Options" className="item">
              <Dropdown.Menu>
                <Dropdown.Item>
                  <a rel="noopener noreferrer" target="_blank" href={`/api/traces/${traceID}`}>
                    View Trace JSON
                  </a>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Menu>
        </div>
        <div className="inline-block">
          <div className="ui input">
            <input
              id="trace-page__text-filter"
              type="text"
              defaultValue={textFilter}
              placeholder="Search..."
              onChange={event => updateTextFilter(event.target.value)}
            />
          </div>
        </div>
      </div>
      {!slimView &&
        <div>
          {HEADER_ITEMS.map(({ renderer, propName, title, key }) =>
            <div className="inline-block mr1" key={key}>
              <strong>
                {title}:{' '}
              </strong>
              {propName ? props[propName] : renderer(props)}
            </div>
          )}
        </div>}
    </header>
  );
}

TracePageHeader.propTypes = {
  traceID: PropTypes.string,
  name: PropTypes.string,
  maxDepth: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  numServices: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  numSpans: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  durationMs: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  timestampMs: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  slimView: PropTypes.bool,
  onSlimViewClicked: PropTypes.func,
};

TracePageHeader.contextTypes = {
  textFilter: PropTypes.string.isRequired,
  updateTextFilter: PropTypes.func.isRequired,
};
