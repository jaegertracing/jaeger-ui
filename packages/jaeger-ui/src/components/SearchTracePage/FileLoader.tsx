// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Upload, message } from 'antd';
import { IoDocumentAttachOutline } from 'react-icons/io5';

import readJsonFile, { OtlpTransformError } from '../../utils/readJsonFile';
import transformTraceData from '../../model/transform-trace-data';
import { traceToTraceSummary } from '../../model/trace-summary';
import { populateTraceCache } from '../../hooks/useTraceLoading';
import type { SpanData, TraceData } from '../../types/trace';
import type { TraceSummary } from '../../types/trace-summary';

import './FileLoader.css';

const Dragger = Upload.Dragger;

type FileLoaderProps = {
  onTracesLoaded: (summaries: TraceSummary[], rawTraces: unknown[]) => void;
};

export type LoadResult = {
  summaries: TraceSummary[];
  rawTraces: unknown[];
  errorCount: number;
};

export async function loadTracesFromFile(file: File): Promise<LoadResult> {
  const parsed: unknown = await readJsonFile({ file });

  // Normalize to array: handle { data: [...] }, { data: {} }, [...], or a single object.
  let traces: unknown[];
  if (Array.isArray(parsed)) {
    traces = parsed;
  } else if (Array.isArray((parsed as any)?.data)) {
    traces = (parsed as any).data;
  } else if ((parsed as any)?.data != null) {
    traces = [(parsed as any).data];
  } else {
    traces = [parsed];
  }

  const summaries: TraceSummary[] = [];
  const rawTraces: unknown[] = [];
  let errorCount = 0;

  for (const raw of traces) {
    try {
      // Clone before transforming: transformTraceData mutates the input in place
      // (adds childSpans, ref.span backlinks, etc.), so we must preserve a clean copy
      // for download serialization.
      const rawClone = structuredClone(raw);
      const traceData = transformTraceData(raw as TraceData & { spans: SpanData[] });
      if (!traceData) {
        errorCount++;
        continue;
      }
      const otel = traceData.asOtelTrace();
      populateTraceCache(otel);
      summaries.push(traceToTraceSummary(otel));
      rawTraces.push(rawClone);
    } catch {
      errorCount++;
    }
  }

  return { summaries, rawTraces, errorCount };
}

export default function FileLoader(props: FileLoaderProps) {
  return (
    <Dragger
      accept=".json,.jsonl"
      beforeUpload={file => {
        // beforeUpload(file, fileList) is called once per selected file. Each invocation
        // receives the full fileList, so iterating fileList here would process N files
        // N times (N²). We process only the current `file` argument to avoid that.
        loadTracesFromFile(file)
          .then(({ summaries, rawTraces, errorCount }) => {
            if (errorCount > 0) {
              message.error(
                `${errorCount} trace${errorCount > 1 ? 's' : ''} could not be loaded from ${file.name}.`
              );
            }
            if (summaries.length > 0) {
              props.onTracesLoaded(summaries, rawTraces);
            } else if (errorCount === 0) {
              message.warning(`No traces found in ${file.name}.`);
            }
          })
          .catch((err: unknown) => {
            // The OTLP transform call reaching the backend is a network/availability
            // failure, not a parse error - the file's JSON was already valid by the
            // time this rejects. Report it distinctly so the message doesn't blame
            // the file for a backend that wasn't reachable.
            if (err instanceof OtlpTransformError) {
              message.error(`${file.name}: ${err.message}`);
              return;
            }
            message.error(
              `Failed to parse ${file.name}: ${err instanceof Error ? err.message : String(err)}`
            );
          });
        return false;
      }}
      multiple
    >
      <IoDocumentAttachOutline className="Dragger--icon" />
      <p className="ant-upload-text">Click or drag files to this area.</p>
      <p className="ant-upload-hint">JSON files containing one or more traces are supported.</p>
    </Dragger>
  );
}
