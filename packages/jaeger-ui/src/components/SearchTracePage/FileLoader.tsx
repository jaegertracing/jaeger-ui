// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Upload, message } from 'antd';
import { z } from 'zod';
import { IoDocumentAttachOutline } from 'react-icons/io5';

import readJsonFile from '../../utils/readJsonFile';
import transformTraceData from '../../model/transform-trace-data';
import { traceToTraceSummary } from '../../model/trace-summary';
import { populateTraceCache } from '../../hooks/useTraceLoading';
import type { SpanData, TraceData } from '../../types/trace';
import type { TraceSummary } from '../../types/trace-summary';
import { parseOtelTrace } from '../../api/v3/parser';
import { isOtelUpload, splitOtelUpload, validateOtelUpload } from '../../utils/otel-upload';
import type { TracesDataWire } from '../../api/v3/schemas';

import './FileLoader.css';

const Dragger = Upload.Dragger;

type FileLoaderProps = {
  onTracesLoaded: (summaries: TraceSummary[], rawTraces: unknown[]) => void;
};

export type LoadResult = {
  summaries: TraceSummary[];
  rawTraces: unknown[];
  errorCount: number;
  // Reason for the first rejected OTLP document, shown alongside the error count.
  errorDetail?: string;
};

function describeUploadError(err: unknown): string {
  if (err instanceof z.ZodError) {
    const [issue] = err.issues;
    return issue.path.length ? `${issue.message} (at ${issue.path.join('.')})` : issue.message;
  }
  return err instanceof Error ? err.message : String(err);
}

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
  let errorDetail: string | undefined;

  const otelDocuments: TracesDataWire[] = [];
  const legacyDocuments: unknown[] = [];
  for (const raw of traces) {
    if (isOtelUpload(raw)) {
      try {
        otelDocuments.push(validateOtelUpload(raw));
      } catch (err) {
        errorCount++;
        errorDetail ??= describeUploadError(err);
      }
    } else {
      legacyDocuments.push(raw);
    }
  }

  // A trace may span several JSONL envelopes or array entries. Publish it only
  // after grouping every valid document, so later entries cannot overwrite spans.
  for (const data of splitOtelUpload(otelDocuments)) {
    try {
      const otel = parseOtelTrace(data);
      if (!otel) {
        errorCount++;
        continue;
      }
      populateTraceCache(otel);
      summaries.push(traceToTraceSummary(otel));
      rawTraces.push(data);
    } catch (err) {
      errorCount++;
      errorDetail ??= describeUploadError(err);
    }
  }

  for (const raw of legacyDocuments) {
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

  return { summaries, rawTraces, errorCount, errorDetail };
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
          .then(({ summaries, rawTraces, errorCount, errorDetail }) => {
            if (errorCount > 0) {
              const detail = errorDetail ? `: ${errorDetail}` : '.';
              message.error(
                `${errorCount} trace${errorCount > 1 ? 's' : ''} could not be loaded from ${file.name}${detail}`
              );
            }
            if (summaries.length > 0) {
              props.onTracesLoaded(summaries, rawTraces);
            } else if (errorCount === 0) {
              message.warning(`No traces found in ${file.name}.`);
            }
          })
          .catch((err: unknown) => {
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
