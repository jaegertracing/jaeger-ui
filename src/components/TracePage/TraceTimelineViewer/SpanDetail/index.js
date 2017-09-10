// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React from 'react';

import AccordianKeyValues from './AccordianKeyValues';
import AccordianLogs from './AccordianLogs';
import DetailState from './DetailState';
import { formatDuration } from '../utils';
import type { Log, Span } from '../../../../types';

import './index.css';

type SpanDetailProps = {
  detailState: DetailState,
  logItemToggle: (string, Log) => void,
  logsToggle: string => void,
  processToggle: string => void,
  span: Span,
  tagsToggle: string => void,
  traceStartTime: number,
};

export default function SpanDetail(props: SpanDetailProps) {
  const { detailState, logItemToggle, logsToggle, processToggle, span, tagsToggle, traceStartTime } = props;
  const { isTagsOpen, isProcessOpen, logs: logsState } = detailState;
  const { operationName, process, duration, relativeStartTime, spanID, logs, tags } = span;
  return (
    <div>
      <div>
        <h3 className="mb1">
          {operationName}
        </h3>
        <div>
          <div className="inline-block mr1">
            <strong>Service: </strong>
            <span>
              {process.serviceName}
            </span>
          </div>
          <div className="inline-block mr1">
            <strong>Duration: </strong>
            <span>
              {formatDuration(duration)}
            </span>
          </div>
          <div className="inline-block mr1">
            <strong>Start Time: </strong>
            <span>
              {formatDuration(relativeStartTime)}
            </span>
          </div>
        </div>
        <hr />
      </div>
      <div>
        <div>
          <AccordianKeyValues
            data={tags}
            highContrast
            label="Tags"
            isOpen={isTagsOpen}
            onToggle={() => tagsToggle(spanID)}
          />
          {process.tags &&
            <AccordianKeyValues
              data={process.tags}
              highContrast
              label="Process"
              isOpen={isProcessOpen}
              onToggle={() => processToggle(spanID)}
            />}
        </div>
        {logs &&
          logs.length > 0 &&
          <AccordianLogs
            logs={logs}
            isOpen={logsState.isOpen}
            openedItems={logsState.openedItems}
            onToggle={() => logsToggle(spanID)}
            onItemToggle={logItem => logItemToggle(spanID, logItem)}
            timestamp={traceStartTime}
          />}

        <small className="SpanDetail--debugInfo">
          <span className="SpanDetail--debugLabel" data-label="SpanID:" />{' '}
          <span className="SpanDetail--debugValue">{spanID}</span>
        </small>
      </div>
    </div>
  );
}
