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
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

import AccordianKeyValues from './AccordianKeyValues';
import { formatDuration } from '../utils';
import { TNil } from '../../../../types';
import { Log, KeyValuePair, Link } from '../../../../types/trace';

import './AccordianLogs.css';

type AccordianLogsProps = {
  interactive?: boolean;
  isOpen: boolean;
  linksGetter?: ((pairs: KeyValuePair[], index: number) => Link[]) | TNil;
  logs: Log[];
  onItemToggle?: (log: Log) => void;
  onToggle?: () => void;
  openedItems?: Set<Log>;
  timestamp: number;
  currentViewRangeTime: [number, number];
  traceDuration: number;
};

export default function AccordianLogs({
  interactive = true,
  isOpen,
  linksGetter,
  logs,
  openedItems,
  onItemToggle,
  onToggle,
  timestamp,
  currentViewRangeTime,
  traceDuration,
}: AccordianLogsProps) {
  let arrow: React.ReactNode | null = null;
  let HeaderComponent: 'span' | 'a' = 'span';
  let headerProps: object | null = null;
  const [showOutOfRangeLogs, setShowOutOfRangeLogs] = React.useState(false);

  const inRangeLogs = React.useMemo(() => {
    const viewStartAbsolute = timestamp + currentViewRangeTime[0] * traceDuration;
    const viewEndAbsolute = timestamp + currentViewRangeTime[1] * traceDuration;
    return logs.filter(log => log.timestamp >= viewStartAbsolute && log.timestamp <= viewEndAbsolute);
  }, [logs, timestamp, currentViewRangeTime, traceDuration]);

  const logsToDisplay = showOutOfRangeLogs ? logs : inRangeLogs;
  const displayedCount = logsToDisplay.length;
  const inRangeCount = inRangeLogs.length;
  const totalCount = logs.length;

  let title = `Logs (${displayedCount})`;
  let toggleLink: React.ReactNode = null;

  if (!showOutOfRangeLogs && inRangeCount < totalCount) {
    title = `Logs (${inRangeCount} of ${totalCount})`;
    toggleLink = (
      <button type="button" className="AccordianLogs--toggle" onClick={() => setShowOutOfRangeLogs(true)}>
        show all
      </button>
    );
  } else if (showOutOfRangeLogs && inRangeCount < totalCount) {
    title = `Logs (${totalCount})`;
    toggleLink = (
      <button type="button" className="AccordianLogs--toggle" onClick={() => setShowOutOfRangeLogs(false)}>
        show in range
      </button>
    );
  }

  if (interactive) {
    arrow = isOpen ? (
      <IoChevronDown className="u-align-icon" />
    ) : (
      <IoChevronForward className="u-align-icon" />
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
        {arrow} <strong>{title}</strong> {toggleLink}
      </HeaderComponent>
      {isOpen && (
        <div className="AccordianLogs--content">
          {_sortBy(logsToDisplay, 'timestamp').map((log, i) => (
            <AccordianKeyValues
              // `i` is necessary in the key because timestamps can repeat

              key={`${log.timestamp}-${i}`}
              className={i < logsToDisplay.length - 1 ? 'ub-mb1' : null}
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
