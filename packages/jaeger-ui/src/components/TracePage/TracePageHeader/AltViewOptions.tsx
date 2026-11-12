// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Dropdown, Button, message } from 'antd';
import { IoChevronDown } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import './AltViewOptions.css';

import { trackViewChange, trackJsonView, trackRawJsonView, trackJsonDownload } from './TracePageHeader.track';
import { jaegerClient } from '../../../api/v3/client';
import { getUploadedRawTrace, isUploadedTrace } from '../../SearchTracePage/useUploadedTraces';
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

// FileLoader caches OTLP uploads as the raw document; legacy Jaeger JSON uploads have no OTLP form.
function isOtlpDocument(raw: unknown): boolean {
  return (
    raw !== null && typeof raw === 'object' && 'resourceSpans' in raw && Array.isArray(raw.resourceSpans)
  );
}

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
  // fetchTrace has no timeout, so a second click while a download is in flight is ignored.
  const [downloading, setDownloading] = React.useState(false);
  const downloadingRef = React.useRef(false);

  const handleSelectView = (item: ETraceViewType) => {
    trackViewChange(item);
    onTraceViewChange(item);
  };

  const dropdownItems: { key: string; label: React.ReactNode; disabled?: boolean }[] = MENU_ITEMS.filter(
    item => item.viewType !== viewType
  ).map(item => ({
    key: item.viewType,
    label: (
      <a onClick={() => handleSelectView(item.viewType)} role="button">
        {item.label}
      </a>
    ),
  }));
  if (!disableJsonView) {
    const traceIdHex = toTraceIdHex(traceID);
    const traceUrl = prefixUrl(`/api/v3/traces/${traceIdHex}`);
    // An uploaded trace may be missing from the backend, or the backend may hold different data
    // under its ID, so it is written from the upload cache instead. Uploads only change on the
    // search page, which is unmounted here, so reading the cache at render time is enough.
    const uploaded = isUploadedTrace(traceID);
    const uploadedRaw = uploaded ? getUploadedRawTrace(traceID) : undefined;
    const fileName = `trace-${traceIdHex}.json`;
    // Writes the trace as the backend returned it, or as it was uploaded, rather than re-encoding
    // the parsed model, so span IDs, int vs. double values and int64s beyond 2^53 survive a round
    // trip through upload.
    const downloadTrace = async () => {
      if (downloadingRef.current) return;
      trackJsonDownload();
      if (uploaded) {
        downloadTraces([uploadedRaw], fileName);
        return;
      }
      downloadingRef.current = true;
      setDownloading(true);
      try {
        downloadTraces([await jaegerClient.fetchTrace(traceIdHex)], fileName);
      } catch (err) {
        message.error(`Failed to download trace: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        downloadingRef.current = false;
        setDownloading(false);
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
      }
    );
    // A legacy Jaeger JSON upload has no OTLP document to write, so the item is hidden for it.
    if (!uploaded || isOtlpDocument(uploadedRaw)) {
      dropdownItems.push({
        key: 'trace-json-download',
        disabled: downloading,
        label: (
          <a onClick={downloadTrace} role="button" aria-disabled={downloading}>
            {downloading ? 'Downloading Trace…' : 'Download Trace (OTLP JSON)'}
          </a>
        ),
      });
    }
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
