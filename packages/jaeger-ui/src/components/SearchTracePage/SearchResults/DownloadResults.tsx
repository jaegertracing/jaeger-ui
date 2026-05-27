// Copyright (c) 2023 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, message } from 'antd';

import JaegerAPI from '../../../api/jaeger';
import { pooledMap } from '../../../utils/pooledMap';
import type { TraceSummary } from '../../../types/trace-summary';

import './DownloadResults.css';

type Props = {
  traceSummaries: TraceSummary[];
  rawTraces: unknown[];
};

export function createBlob(traces: unknown[]) {
  return new Blob([`{"data":${JSON.stringify(traces)}}`], { type: 'application/json' });
}

export default function DownloadResults({ traceSummaries, rawTraces }: Props) {
  // undefined = idle; 0–1 = fraction of traces fetched from backend
  const [progress, setProgress] = useState<number | undefined>(undefined);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onClick = useCallback(async () => {
    // Build a lookup from traceID → raw trace for any locally held data (uploaded traces).
    // For summaries without a cached raw, we must fetch from the backend.
    const rawByID = new Map<string, unknown>(
      rawTraces
        .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
        .map(r => [String((r as Record<string, unknown>).traceID), r])
    );
    const missing = traceSummaries.filter(s => !rawByID.has(s.traceID));
    let traces: unknown[];
    if (missing.length > 0) {
      // Fetch missing traces with bounded concurrency so we report progress as responses
      // arrive without overwhelming the backend. Cap at 6 — the HTTP/1.1 per-host limit,
      // a safe fanout for any Jaeger deployment regardless of HTTP version.
      const cancelled = { current: false };
      setProgress(0);
      try {
        const fetched = await pooledMap(
          missing,
          async s => {
            const r = await JaegerAPI.fetchTrace(s.traceID);
            return r?.data?.[0] ?? r;
          },
          6,
          done => {
            if (!cancelled.current && isMountedRef.current)
              setProgress((traceSummaries.length - missing.length + done) / traceSummaries.length);
          }
        );
        fetched.forEach((raw, i) => rawByID.set(missing[i].traceID, raw));
      } catch (err) {
        cancelled.current = true;
        message.error(`Failed to retrieve traces: ${err instanceof Error ? err.message : String(err)}`);
        return;
      } finally {
        cancelled.current = true;
        if (isMountedRef.current) setProgress(undefined);
      }
    }
    traces = traceSummaries.map(s => rawByID.get(s.traceID)).filter(Boolean);
    const missingCount = traceSummaries.length - traces.length;
    if (missingCount > 0) {
      message.warning(
        `${missingCount} trace${missingCount > 1 ? 's' : ''} could not be retrieved and will be omitted from the download.`
      );
    }
    const file = createBlob(traces);
    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = `traces-${Date.now()}.json`;
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(element.href);
    element.remove();
  }, [rawTraces, traceSummaries]);

  const downloading = progress !== undefined;
  return (
    <Button
      className="ub-ml2 DownloadResults--btn"
      htmlType="button"
      disabled={downloading}
      onClick={onClick}
    >
      {downloading ? 'Retrieving traces…' : 'Download Results'}
      {downloading && (
        <span
          className="DownloadResults--bar"
          role="progressbar"
          aria-label="Trace download progress"
          aria-valuenow={Math.round(progress! * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ width: `${Math.round(progress! * 100)}%` }}
        />
      )}
    </Button>
  );
}
