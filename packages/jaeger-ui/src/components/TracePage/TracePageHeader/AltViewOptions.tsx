// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Dropdown, Button, message } from 'antd';
import { IoChevronDown } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import './AltViewOptions.css';

import { trackViewChange, trackJsonView, trackRawJsonView, trackJsonDownload } from './TracePageHeader.track';
import { jaegerClient } from '../../../api/v3/client';
import { downloadTraces } from '../../../utils/download-traces';
import prefixUrl from '../../../utils/prefix-url';
import { ETraceViewType } from '../types';
import { getTargetBlankOrTop } from '../../../utils/config/get-target';
import { toTraceIdHex } from '../../../utils/trace-id';

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

  const handleSelectView = (item: ETraceViewType) => {
    trackViewChange(item);
    onTraceViewChange(item);
  };

  const dropdownItems = MENU_ITEMS.filter(item => item.viewType !== viewType).map(item => ({
    key: item.viewType as ETraceViewType | string,
    label: (
      <a onClick={() => handleSelectView(item.viewType)} role="button">
        {item.label}
      </a>
    ),
  }));
  if (!disableJsonView) {
    const traceIdHex = toTraceIdHex(traceID);
    const traceUrl = prefixUrl(`/api/v3/traces/${traceIdHex}`);
    // Writes the trace as the backend returned it rather than re-encoding the parsed model, so
    // span IDs, int vs. double values and int64s beyond 2^53 survive a round trip through upload.
    const downloadTrace = async () => {
      trackJsonDownload();
      try {
        downloadTraces([await jaegerClient.fetchTrace(traceIdHex)], `trace-${traceIdHex}.json`);
      } catch (err) {
        message.error(`Failed to download trace: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    dropdownItems.push(
      {
        key: 'trace-json',
        label: (
          <Link
            to={`${traceUrl}?prettyPrint=true`}
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
            to={`${traceUrl}?rawTraces=true&prettyPrint=true`}
            rel="noopener noreferrer"
            target={getTargetBlankOrTop()}
            onClick={trackRawJsonView}
          >
            Trace JSON (unadjusted)
          </Link>
        ),
      },
      {
        key: 'trace-json-download',
        label: (
          <a onClick={downloadTrace} role="button">
            Download Trace (OTLP JSON)
          </a>
        ),
      }
    );
  }

  const currentItem = MENU_ITEMS.find(item => item.viewType === viewType);
  const dropdownText = currentItem ? currentItem.label : 'Alternate Views';
  return (
    <Dropdown menu={{ items: dropdownItems }} trigger={['click']}>
      <Button className="AltViewOptions">
        {`${dropdownText} `}
        <IoChevronDown />
      </Button>
    </Dropdown>
  );
}
