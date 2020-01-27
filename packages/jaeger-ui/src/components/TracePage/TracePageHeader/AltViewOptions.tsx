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

type Props = {
  onTraceGraphViewClicked: (index: number) => void;
  traceID: string;
  selectedTraceView: number;
};

export default function AltViewOptions(props: Props) {
  const { onTraceGraphViewClicked, selectedTraceView, traceID } = props;
  const menuItems = ['Trace Timeline', 'Trace Graph', 'Trace Statistics'];

  const handleToggleView = (index: number, item: string) => {
    if (item === menuItems[0]) {
      trackGanttView();
    } else if (item === menuItems[1]) {
      trackGraphView();
    } else if (item === menuItems[2]) {
      trackStatisticsView();
    }
    onTraceGraphViewClicked(index);
  };

  const toggle = () => {
    let nextIndex = selectedTraceView + 1;
    if (nextIndex > 2) {
      nextIndex = 0;
    }
    if (nextIndex === 0) {
      trackGanttView();
    } else if (nextIndex === 1) {
      trackGraphView();
    } else if (nextIndex === 2) {
      trackStatisticsView();
    }
    onTraceGraphViewClicked(nextIndex);
  };

  const menu = (
    <Menu>
      {menuItems.map((item, index) =>
        index === selectedTraceView ? null : (
          <Menu.Item key={item}>
            <a onClick={() => handleToggleView(index, item)} role="button">
              {item}
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
      <Button onClick={toggle} className="ub-mr2" htmlType="button">
        Alternate Views <Icon type="down" />
      </Button>
    </Dropdown>
  );
}
