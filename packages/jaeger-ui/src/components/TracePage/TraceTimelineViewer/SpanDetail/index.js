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
import { Divider, Tooltip } from 'antd';
import cx from 'classnames';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import type { Location, RouterHistory } from 'react-router-dom';

import AccordianKeyValues from './AccordianKeyValues';
import AccordianLogs from './AccordianLogs';
import DetailState from './DetailState';
import { formatDuration } from '../utils';
import LabeledList from '../../../common/LabeledList';
import { extractUIFindFromState } from '../../../common/UIFindInput';
import updateUIFind from '../../../../utils/update-ui-find';

import type { Log, Span, KeyValuePair, Link } from '../../../../types/trace';

import './index.css';

type SpanDetailProps = {
  detailState: DetailState,
  history: RouterHistory,
  linksGetter: ?(KeyValuePair[], number) => Link[],
  location: Location,
  logItemToggle: (string, Log) => void,
  logsToggle: string => void,
  processToggle: string => void,
  span: Span,
  tagsToggle: string => void,
  traceStartTime: number,
  uiFind: string,
};

export function UnconnectedSpanDetail(props: SpanDetailProps) {
  const {
    detailState,
    history,
    linksGetter,
    location,
    logItemToggle,
    logsToggle,
    processToggle,
    span,
    tagsToggle,
    traceStartTime,
    uiFind = '',
  } = props;
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

  const addSpanIDToSearch = () => {
    if (!uiFind.includes(spanID)) {
      updateUIFind({
        history,
        location,
        uiFind: cx(uiFind, spanID),
      });
    }
  };

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
            linksGetter={linksGetter}
            isOpen={isTagsOpen}
            onToggle={() => tagsToggle(spanID)}
          />
          {process.tags && (
            <AccordianKeyValues
              className="ub-mb1"
              data={process.tags}
              label="Process"
              linksGetter={linksGetter}
              isOpen={isProcessOpen}
              onToggle={() => processToggle(spanID)}
            />
          )}
        </div>
        {logs &&
          logs.length > 0 && (
            <AccordianLogs
              linksGetter={linksGetter}
              logs={logs}
              isOpen={logsState.isOpen}
              openedItems={logsState.openedItems}
              onToggle={() => logsToggle(spanID)}
              onItemToggle={logItem => logItemToggle(spanID, logItem)}
              timestamp={traceStartTime}
            />
          )}

        <small className="SpanDetail--debugInfo">
          <Tooltip title="Click ID to add to filter">
            <span className="SpanDetail--debugLabel" data-label="SpanID:" />{' '}
            <button className="SpanDetail--debugValue" onClick={addSpanIDToSearch}>
              {spanID}
            </button>
          </Tooltip>
        </small>
      </div>
    </div>
  );
}

export default withRouter(connect(extractUIFindFromState)(UnconnectedSpanDetail));
