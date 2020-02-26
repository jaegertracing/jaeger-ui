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
import { Button, Dropdown, Icon, Menu } from 'antd';
import { Link } from 'react-router-dom';

import {
  trackGanttView,
  trackGraphView,
  trackStatisticsView,
  trackJsonView,
  trackRawJsonView,
} from './TracePageHeader.track';
import prefixUrl from '../../../utils/prefix-url';
import { ETraceViewType } from '../types';

type Props = {
  onTraceViewChange: (actualViewType: ETraceViewType) => void;
  traceID: string;
  viewType: ETraceViewType;
};

const menuItems = [
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
];

export default function AltViewOptions(props: Props) {
  const { onTraceViewChange, viewType, traceID } = props;

  const handleToggleView = (item: ETraceViewType) => {
    if (item === ETraceViewType.TraceTimelineViewer) {
      trackGanttView();
    } else if (item === ETraceViewType.TraceGraph) {
      trackGraphView();
    } else if (item === ETraceViewType.TraceStatistics) {
      trackStatisticsView();
    }
    onTraceViewChange(item);
  };

  const menu = (
    <Menu>
      {menuItems.map(item =>
        item.viewType === viewType ? null : (
          <Menu.Item key={item.label}>
            <a onClick={() => handleToggleView(item.viewType)} role="button">
              {item.label}
            </a>
          </Menu.Item>
        )
      )}
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

  return (
    <Dropdown overlay={menu}>
      <Button className="ub-mr2" htmlType="button">
        {menuItems.find(test => test.viewType === viewType) !== undefined
          ? menuItems.find(test => test.viewType === viewType)!.label
          : ''}
        <Icon type="down" />
      </Button>
    </Dropdown>
  );
}
