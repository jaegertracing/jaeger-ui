// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Select } from 'antd';
import './AltViewOptions.css';

import { trackViewChange, trackJsonView, trackRawJsonView } from './TracePageHeader.track';
import prefixUrl from '../../../utils/prefix-url';
import { ETraceViewType } from '../types';
import { getTargetBlankOrTop } from '../../../utils/config/get-target';

type Props = {
  onTraceViewChange: (viewType: ETraceViewType) => void;
  traceID: string;
  disableJsonView: boolean;
  viewType: ETraceViewType;
};

const MENU_ITEMS: { viewType: ETraceViewType; label: string }[] = [
  { viewType: ETraceViewType.TraceTimelineViewer, label: 'Trace Timeline' },
  { viewType: ETraceViewType.TraceGraph, label: 'Trace Graph' },
  { viewType: ETraceViewType.TraceStatistics, label: 'Trace Statistics' },
  { viewType: ETraceViewType.TraceSpansView, label: 'Trace Spans Table' },
  { viewType: ETraceViewType.TraceFlamegraph, label: 'Trace Flamegraph' },
  { viewType: ETraceViewType.TraceLogs, label: 'Trace Logs' },
  { viewType: ETraceViewType.GenAITimelineViewer, label: 'GenAI View' },
];

export default function AltViewOptions(props: Props) {
  const { onTraceViewChange, viewType, traceID, disableJsonView } = props;

  const handleChange = (value: string) => {
    if (value === 'trace-json') {
      trackJsonView();
      window.open(
        prefixUrl(`/api/traces/${traceID}?prettyPrint=true`),
        getTargetBlankOrTop(),
        'noopener,noreferrer'
      );
    } else if (value === 'trace-json-unadjusted') {
      trackRawJsonView();
      window.open(
        prefixUrl(`/api/traces/${traceID}?raw=true&prettyPrint=true`),
        getTargetBlankOrTop(),
        'noopener,noreferrer'
      );
    } else {
      trackViewChange(value as ETraceViewType);
      onTraceViewChange(value as ETraceViewType);
    }
  };

  const options: { value: ETraceViewType | 'trace-json' | 'trace-json-unadjusted'; label: string }[] =
    MENU_ITEMS.map(item => ({
      value: item.viewType,
      label: item.label,
    }));

  if (!disableJsonView) {
    options.push(
      {
        value: 'trace-json',
        label: 'Trace JSON',
      },
      {
        value: 'trace-json-unadjusted',
        label: 'Trace JSON (unadjusted)',
      }
    );
  }

  return (
    <Select
      className="AltViewOptions"
      value={viewType}
      onChange={handleChange}
      options={options}
      popupMatchSelectWidth={false}
      data-testid="AltViewOptions"
    />
  );
}
