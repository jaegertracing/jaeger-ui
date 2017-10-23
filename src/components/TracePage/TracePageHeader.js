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

import PropTypes from 'prop-types';
import React from 'react';
import { Dropdown, Menu } from 'semantic-ui-react';

import { formatDatetime, formatDuration } from '../../utils/date';

export const HEADER_ITEMS = [
  {
    key: 'timestamp',
    title: 'Trace Start',
    renderer: props => formatDatetime(props.timestamp),
  },
  {
    key: 'duration',
    title: 'Duration',
    renderer: props => formatDuration(props.duration),
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

export default function TracePageHeader(props) {
  const { traceID, name, slimView, onSlimViewClicked, updateTextFilter, textFilter } = props;

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
  duration: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  maxDepth: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  name: PropTypes.string,
  numServices: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  numSpans: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  onSlimViewClicked: PropTypes.func,
  slimView: PropTypes.bool,
  textFilter: PropTypes.string,
  timestamp: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
  traceID: PropTypes.string,
  updateTextFilter: PropTypes.func.isRequired,
};
