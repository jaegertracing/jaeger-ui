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
import { Dropdown, Menu } from 'semantic-ui-react';

import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { FALLBACK_TRACE_NAME } from '../../constants';
import { formatDatetime, formatDuration } from '../../utils/date';

type TracePageHeaderProps = {
  traceID: string,
  name: String,
  slimView: boolean,
  onSlimViewClicked: () => void,
  updateTextFilter: string => void,
  textFilter: ?string,
  // these props are used by the `HEADER_ITEMS`
  // eslint-disable-next-line react/no-unused-prop-types
  timestamp: number,
  // eslint-disable-next-line react/no-unused-prop-types
  duration: number,
  // eslint-disable-next-line react/no-unused-prop-types
  numServices: number,
  // eslint-disable-next-line react/no-unused-prop-types
  maxDepth: number,
  // eslint-disable-next-line react/no-unused-prop-types
  numSpans: number,
};

export const HEADER_ITEMS = [
  {
    key: 'timestamp',
    title: 'Trace Start',
    propName: null,
    renderer: (props: TracePageHeaderProps) => formatDatetime(props.timestamp),
  },
  {
    key: 'duration',
    title: 'Duration',
    propName: null,
    renderer: (props: TracePageHeaderProps) => formatDuration(props.duration),
  },
  {
    key: 'service-count',
    title: 'Services',
    propName: 'numServices',
    renderer: null,
  },
  {
    key: 'depth',
    title: 'Depth',
    propName: 'maxDepth',
    renderer: null,
  },
  {
    key: 'span-count',
    title: 'Total Spans',
    propName: 'numSpans',
    renderer: null,
  },
];

export default function TracePageHeader(props: TracePageHeaderProps) {
  const { traceID, name, slimView, onSlimViewClicked, updateTextFilter, textFilter } = props;

  if (!traceID) {
    return null;
  }

  return (
    <header className="mb1">
      <div className="flex">
        <div className="flex-auto">
          <h2>
            <a onClick={onSlimViewClicked} role="switch" aria-checked={!slimView}>
              <i
                className={`ui icon angle double ${slimView ? 'right' : 'down'}`}
                style={{ float: 'none' }}
              />
            </a>
            {name || FALLBACK_TRACE_NAME}
          </h2>
        </div>
        <div className="inline-block mr1">
          <KeyboardShortcutsHelp />
        </div>
        <div className="mr1">
          <Menu>
            <Dropdown text="View Options" className="item">
              <Dropdown.Menu>
                <Dropdown.Item>
                  <a rel="noopener noreferrer" target="_blank" href={`/api/traces/${traceID}`}>
                    Trace JSON
                  </a>
                </Dropdown.Item>
                <Dropdown.Item>
                  <a rel="noopener noreferrer" target="_blank" href={`/api/traces/${traceID}/?raw=true`}>
                    Trace JSON (unadjusted)
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
      {!slimView && (
        <div>
          {HEADER_ITEMS.map(({ renderer, propName, title, key }) => {
            let value: ?React.Node;
            if (propName) {
              value = props[propName];
            } else if (renderer) {
              value = renderer(props);
            } else {
              throw new Error('Invalid HEADER_ITEM configuration');
            }
            return (
              <div className="inline-block mr1" key={key}>
                {title}:
                <strong>{value}</strong>
              </div>
            );
          })}
        </div>
      )}
    </header>
  );
}
