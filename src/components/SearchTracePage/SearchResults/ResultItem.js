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
import { Col, Divider, Row, Tag } from 'antd';
import { sortBy } from 'lodash';
import moment from 'moment';

import { FALLBACK_TRACE_NAME } from '../../../constants';
import colorGenerator from '../../../utils/color-generator';
import { formatDuration, formatRelativeDate } from '../../../utils/date';

import type { TraceSummary } from '../../../types/search';

import './ResultItem.css';

export default function ResultItem({
  trace,
  durationPercent = 100,
}: {
  trace: TraceSummary,
  durationPercent: number,
}) {
  const { duration, services, timestamp, numberOfErredSpans, numberOfSpans, traceName } = trace;
  const mDate = moment(timestamp);
  const timeStr = mDate.format('h:mm:ss a');
  const fromNow = mDate.fromNow();
  return (
    <div className="ResultItem">
      <div className="ResultItem--title clearfix">
        <span className="ResultItem--durationBar" style={{ width: `${durationPercent}%` }} />
        <span className="u-right u-pos-rel">{formatDuration(duration * 1000)}</span>
        <h3 className="u-space-nil u-pos-rel">{traceName || FALLBACK_TRACE_NAME}</h3>
      </div>
      <Row>
        <Col span={4} className="u-pad-sm">
          <Tag className="u-space-xs">
            {numberOfSpans} Span{numberOfSpans > 1 && 's'}
          </Tag>
          {Boolean(numberOfErredSpans) && (
            <Tag className="u-space-xs" color="red">
              {numberOfErredSpans} Error{numberOfErredSpans > 1 && 's'}
            </Tag>
          )}
        </Col>
        <Col span={16} className="u-pad-sm">
          <ul className="u-list-reset">
            {sortBy(services, s => s.name).map(service => {
              const { name, numberOfSpans: count } = service;
              return (
                <li key={name} className="u-inline-b u-space-xs">
                  <Tag
                    className="ResultItem--serviceTag"
                    style={{ borderLeftColor: colorGenerator.getColorByKey(name) }}
                  >
                    {name} ({count})
                  </Tag>
                </li>
              );
            })}
          </ul>
        </Col>
        <Col span={4} className="u-pad-sm u-tx-right">
          {formatRelativeDate(timestamp)}
          <Divider type="vertical" />
          {timeStr.slice(0, -3)}&nbsp;{timeStr.slice(-2)}
          <br />
          <small>{fromNow}</small>
        </Col>
      </Row>
    </div>
  );
}
