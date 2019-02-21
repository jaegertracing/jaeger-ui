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
import _sortBy from 'lodash/sortBy';
import IoIosArrowDown from 'react-icons/lib/io/ios-arrow-down';
import IoIosArrowRight from 'react-icons/lib/io/ios-arrow-right';

import AccordianKeyValues from './AccordianKeyValues';
import { formatDuration } from '../utils';
import type { Log, KeyValuePair, Link } from '../../../../types/trace';

import './AccordianLogs.css';

type AccordianLogsProps = {
  interactive?: boolean,
  isOpen: boolean,
  linksGetter?: ?(KeyValuePair[], number) => Link[],
  logs: Log[],
  onItemToggle?: Log => void,
  onToggle?: () => void,
  openedItems?: Set<Log>,
  timestamp: number,
};

export default function AccordianLogs(props: AccordianLogsProps) {
  const { interactive, isOpen, linksGetter, logs, openedItems, onItemToggle, onToggle, timestamp } = props;
  let arrow: React.Node | null = null;
  let HeaderComponent = 'span';
  let headerProps: Object | null = null;
  if (interactive) {
    arrow = isOpen ? (
      <IoIosArrowDown className="u-align-icon" />
    ) : (
      <IoIosArrowRight className="u-align-icon" />
    );
    HeaderComponent = 'a';
    headerProps = {
      'aria-checked': isOpen,
      onClick: onToggle,
      role: 'switch',
    };
  }

  return (
    <div className="AccordianLogs">
      <HeaderComponent className={cx('AccordianLogs--header', { 'is-open': isOpen })} {...headerProps}>
        {arrow} <strong>Logs</strong> ({logs.length})
      </HeaderComponent>
      {isOpen && (
        <div className="AccordianLogs--content">
          {_sortBy(logs, 'timestamp').map((log, i) => (
            <AccordianKeyValues
              // `i` is necessary in the key because timestamps can repeat
              // eslint-disable-next-line react/no-array-index-key
              key={`${log.timestamp}-${i}`}
              className={i < logs.length - 1 ? 'ub-mb1' : null}
              data={log.fields || []}
              highContrast
              interactive={interactive}
              isOpen={openedItems ? openedItems.has(log) : false}
              label={`${formatDuration(log.timestamp - timestamp)}`}
              linksGetter={linksGetter}
              onToggle={interactive && onItemToggle ? () => onItemToggle(log) : null}
            />
          ))}
          <small className="AccordianLogs--footer">
            Log timestamps are relative to the start time of the full trace.
          </small>
        </div>
      )}
    </div>
  );
}

AccordianLogs.defaultProps = {
  interactive: true,
  linksGetter: undefined,
  onItemToggle: undefined,
  onToggle: undefined,
  openedItems: undefined,
};
