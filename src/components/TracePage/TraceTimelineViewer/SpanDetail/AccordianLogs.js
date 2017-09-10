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

import React from 'react';
import _sortBy from 'lodash/sortBy';

import AccordianKeyValues from './AccordianKeyValues';
import { formatDuration } from '../utils';
import type { Log } from '../../../../types';

import './AccordianLogs.css';

type AccordianLogsProps = {
  isOpen: boolean,
  logs: Log[],
  onItemToggle: Log => void,
  onToggle: () => void,
  openedItems: Set<Log>,
  timestamp: number,
};

export default function AccordianLogs(props: AccordianLogsProps) {
  const { isOpen, logs, openedItems, onItemToggle, onToggle, timestamp } = props;

  return (
    <div className="ui segment">
      <a
        className="u-cursor-pointer ui top attached label"
        aria-checked={isOpen}
        onClick={onToggle}
        role="switch"
      >
        <i className={`u-no-float ${isOpen ? 'down' : 'right'} angle double icon`} />
        Logs ({logs.length})
      </a>
      {isOpen &&
        <div>
          {_sortBy(logs, 'timestamp').map((log, i) =>
            <AccordianKeyValues
              // `i` is necessary in the key because timestamps can repeat
              // eslint-disable-next-line react/no-array-index-key
              key={`${log.timestamp}-${i}`}
              compact
              isOpen={openedItems.has(log)}
              data={log.fields || []}
              label={`${formatDuration(log.timestamp - timestamp)}`}
              onToggle={() => onItemToggle(log)}
            />
          )}
          <small className="AccordianLogs--footer">
            **Log timestamps are relative to the start time of the full trace.
          </small>
        </div>}
    </div>
  );
}
