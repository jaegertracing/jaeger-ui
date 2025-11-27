// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Dropdown, Button } from 'antd';
import { IoChevronDown } from 'react-icons/io5';
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
import { getTargetBlankOrTop } from '../../../utils/config/get-target';

type Props = {
  onTraceViewChange: (viewType: ETraceViewType) => void;
  traceID: string;
  disableJsonView: boolean;
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
  {
    viewType: ETraceViewType.TraceFlamegraph,
    label: 'Trace Flamegraph',
  },
];

export default function AltViewOptions(props: Props) {
  const { onTraceViewChange, viewType, traceID, disableJsonView } = props;

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

  const dropdownItems = [
    ...MENU_ITEMS.filter(item => item.viewType !== viewType).map(item => ({
      key: item.viewType as ETraceViewType | string,
      label: (
        <a onClick={() => handleSelectView(item.viewType)} role="button">
          {item.label}
        </a>
      ),
    })),
  ];
  if (!disableJsonView) {
    dropdownItems.push(
      {
        key: 'trace-json',
        label: (
          <Link
            to={prefixUrl(`/api/traces/${traceID}?prettyPrint=true`)}
            rel="noopener noreferrer"
            target={getTargetBlankOrTop()}
            onClick={trackJsonView}
          >
            Trace JSON
          </Link>
        ),
      },
      {
        key: 'trace-json-unadjusted',
        label: (
          <Link
            to={prefixUrl(`/api/traces/${traceID}?raw=true&prettyPrint=true`)}
            rel="noopener noreferrer"
            target={getTargetBlankOrTop()}
            onClick={trackRawJsonView}
          >
            Trace JSON (unadjusted)
          </Link>
        ),
      }
    );
  }

  const currentItem = MENU_ITEMS.find(item => item.viewType === viewType);
  const dropdownText = currentItem ? currentItem.label : 'Alternate Views';
  return (
    <Dropdown menu={{ items: dropdownItems }}>
      <Button className="AltViewOptions">
        {`${dropdownText} `}
        <IoChevronDown />
      </Button>
    </Dropdown>
  );
}
