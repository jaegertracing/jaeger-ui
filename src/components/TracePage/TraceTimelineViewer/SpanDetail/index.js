// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
