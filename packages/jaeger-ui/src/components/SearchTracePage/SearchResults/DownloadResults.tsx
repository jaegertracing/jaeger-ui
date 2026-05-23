// Copyright (c) 2023 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useState, useCallback } from 'react';
import { Button } from 'antd';

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

  const onClick = useCallback(async () => {
    let traces = rawTraces;
    if (traces.length === 0 && traceSummaries.length > 0) {
      // API-only results: fetch with bounded concurrency so we report progress as responses
      // arrive without overwhelming the backend. Cap at 6 — the HTTP/1.1 per-host limit,
      // a safe fanout for any Jaeger deployment regardless of HTTP version.
      setProgress(0);
      try {
        traces = await pooledMap(
          traceSummaries,
          async s => {
            const r = await JaegerAPI.fetchTrace(s.traceID);
            return r?.data?.[0] ?? r;
          },
          6,
          (done, total) => setProgress(done / total)
        );
      } finally {
        setProgress(undefined);
      }
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
        <span className="DownloadResults--bar" style={{ width: `${Math.round(progress! * 100)}%` }} />
      )}
    </Button>
  );
}
