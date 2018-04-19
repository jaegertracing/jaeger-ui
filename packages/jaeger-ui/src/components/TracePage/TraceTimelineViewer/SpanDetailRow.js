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

import SpanDetail from './SpanDetail';
import DetailState from './SpanDetail/DetailState';
import SpanTreeOffset from './SpanTreeOffset';
import TimelineRow from './TimelineRow';
import type { Log, Span } from '../../../types';

import './SpanDetailRow.css';

type SpanDetailRowProps = {
  color: string,
  columnDivision: number,
  detailState: DetailState,
  onDetailToggled: string => void,
  isFilteredOut: boolean,
  logItemToggle: (string, Log) => void,
  logsToggle: string => void,
  processToggle: string => void,
  span: Span,
  tagsToggle: string => void,
  traceStartTime: number,
};

export default class SpanDetailRow extends React.PureComponent<SpanDetailRowProps> {
  props: SpanDetailRowProps;

  _detailToggle = () => {
    this.props.onDetailToggled(this.props.span.spanID);
  };

  render() {
    const {
      color,
      columnDivision,
      detailState,
      isFilteredOut,
      logItemToggle,
      logsToggle,
      processToggle,
      span,
      tagsToggle,
      traceStartTime,
    } = this.props;
    return (
      <TimelineRow className={`detail-row ${isFilteredOut ? 'is-filtered-out' : ''}`}>
        <TimelineRow.Cell width={columnDivision}>
          <SpanTreeOffset level={span.depth + 1} />
          <span>
            <span
              className="detail-row-expanded-accent"
              aria-checked="true"
              onClick={this._detailToggle}
              role="switch"
              style={{ borderColor: color }}
            />
          </span>
        </TimelineRow.Cell>
        <TimelineRow.Cell width={1 - columnDivision}>
          <div className="detail-info-wrapper" style={{ borderTopColor: color }}>
            <SpanDetail
              detailState={detailState}
              logItemToggle={logItemToggle}
              logsToggle={logsToggle}
              processToggle={processToggle}
              span={span}
              tagsToggle={tagsToggle}
              traceStartTime={traceStartTime}
            />
          </div>
        </TimelineRow.Cell>
      </TimelineRow>
    );
  }
}
