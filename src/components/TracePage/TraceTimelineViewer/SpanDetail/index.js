// @flow

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
import { Divider } from 'antd';

import AccordianKeyValues from './AccordianKeyValues';
import AccordianLogs from './AccordianLogs';
import DetailState from './DetailState';
import { formatDuration } from '../utils';
import LabeledList from '../../../common/LabeledList';
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
  const overviewItems = [
    {
      key: 'svc',
      label: 'Service:',
      value: process.serviceName,
    },
    {
      key: 'duration',
      label: 'Duration:',
      value: formatDuration(duration),
    },
    {
      key: 'start',
      label: 'Start Time:',
      value: formatDuration(relativeStartTime),
    },
  ];
  return (
    <div>
      <div className="ub-flex ub-items-center">
        <h2 className="ub-flex-auto ub-m0">{operationName}</h2>
        <LabeledList
          className="ub-tx-right-align"
          dividerClassName="SpanDetail--divider"
          items={overviewItems}
        />
      </div>
      <Divider className="SpanDetail--divider ub-my1" />
      <div>
        <div>
          <AccordianKeyValues
            data={tags}
            label="Tags"
            isOpen={isTagsOpen}
            onToggle={() => tagsToggle(spanID)}
          />
          {process.tags && (
            <AccordianKeyValues
              className="ub-mb1"
              data={process.tags}
              label="Process"
              isOpen={isProcessOpen}
              onToggle={() => processToggle(spanID)}
            />
          )}
        </div>
        {logs &&
          logs.length > 0 && (
            <AccordianLogs
              logs={logs}
              isOpen={logsState.isOpen}
              openedItems={logsState.openedItems}
              onToggle={() => logsToggle(spanID)}
              onItemToggle={logItem => logItemToggle(spanID, logItem)}
              timestamp={traceStartTime}
            />
          )}

        <small className="SpanDetail--debugInfo">
          <span className="SpanDetail--debugLabel" data-label="SpanID:" />{' '}
          <span className="SpanDetail--debugValue">{spanID}</span>
        </small>
      </div>
    </div>
  );
}
