// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Upload } from 'antd';
import { IoDocumentAttachOutline } from 'react-icons/io5';

import readJsonFile from '../../utils/readJsonFile';
import transformTraceData from '../../model/transform-trace-data';
import { traceToTraceSummary } from '../../model/trace-summary';
import { populateTraceCache } from '../../hooks/useTraceLoading';
import type { TraceSummary } from '../../types/trace-summary';

import './FileLoader.css';

const Dragger = Upload.Dragger;

type FileLoaderProps = {
  onTracesLoaded: (summaries: TraceSummary[], rawTraces: unknown[]) => void;
};

export default function FileLoader(props: FileLoaderProps) {
  return (
    <Dragger
      accept=".json,.jsonl"
      beforeUpload={(file, fileList) => {
        fileList.forEach(fileFromList => {
          readJsonFile({ file: fileFromList })
            .then((parsed: any) => {
              const traces = Array.isArray(parsed) ? parsed : (parsed?.data ?? [parsed]);
              const summaries: TraceSummary[] = [];
              const rawTraces: unknown[] = [];
              for (const raw of traces) {
                const traceData = transformTraceData(raw);
                if (!traceData) continue;
                const otel = traceData.asOtelTrace();
                populateTraceCache(otel);
                summaries.push(traceToTraceSummary(otel));
                rawTraces.push(raw);
              }
              props.onTracesLoaded(summaries, rawTraces);
            })
            .catch((err: unknown) => {
              // eslint-disable-next-line no-console
              console.error('Failed to load trace file', err);
            });
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
