// Copyright (c) 2018 Uber Technologies, Inc.
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
import { Dropdown, Icon, Menu } from 'antd';
import { Link } from 'react-router-dom';
import './AltViewOptions.css';

import {
  trackGanttView,
  trackGraphView,
  trackStatisticsView,
  trackTraceSpansView,
  trackJsonView,
  trackRawJsonView,
} from './TracePageHeader.track';
import prefixUrl from '../../../utils/prefix-url';
import { ETraceViewType } from '../types';

type Props = {
  onTraceViewChange: (viewType: ETraceViewType) => void;
  traceID: string;
  viewType: ETraceViewType;
};

const MENU_ITEMS = [
  {
    viewType: ETraceViewType.TraceTimelineViewer,
    label: 'Trace Timeline',
  },
  {
    viewType: ETraceViewType.TraceGraph,
    label: 'Trace Graph',
  },
  {
    viewType: ETraceViewType.TraceStatistics,
    label: 'Trace Statistics',
  },
  {
    viewType: ETraceViewType.TraceSpansView,
    label: 'Trace Spans Table',
  },
];

export default function AltViewOptions(props: Props) {
  const { onTraceViewChange, viewType, traceID } = props;

  const handleSelectView = (item: ETraceViewType) => {
    if (item === ETraceViewType.TraceTimelineViewer) {
      trackGanttView();
    } else if (item === ETraceViewType.TraceGraph) {
      trackGraphView();
    } else if (item === ETraceViewType.TraceStatistics) {
      trackStatisticsView();
    } else if (item === ETraceViewType.TraceSpansView) {
      trackTraceSpansView();
    }
    onTraceViewChange(item);
  };

  const menu = (
    <Menu>
      {MENU_ITEMS.filter(item => item.viewType !== viewType).map(item => (
        <Menu.Item key={item.viewType}>
          <a onClick={() => handleSelectView(item.viewType)} role="button">
            {item.label}
          </a>
        </Menu.Item>
      ))}
      <Menu.Item>
        <Link
          to={prefixUrl(`/api/traces/${traceID}?prettyPrint=true`)}
          rel="noopener noreferrer"
          target="_blank"
          onClick={trackJsonView}
        >
          Trace JSON
        </Link>
      </Menu.Item>
      <Menu.Item>
        <Link
          to={prefixUrl(`/api/traces/${traceID}?raw=true&prettyPrint=true`)}
          rel="noopener noreferrer"
          target="_blank"
          onClick={trackRawJsonView}
        >
          Trace JSON (unadjusted)
        </Link>
      </Menu.Item>
    </Menu>
  );

  const currentItem = MENU_ITEMS.find(item => item.viewType === viewType);
  const dropdownText = currentItem ? currentItem.label : 'Alternate Views';
  return (
    <Dropdown overlay={menu}>
      <div className="AltViewOptions">
        {`${dropdownText} `}
        <Icon type="down" />
      </div>
    </Dropdown>
  );
}
