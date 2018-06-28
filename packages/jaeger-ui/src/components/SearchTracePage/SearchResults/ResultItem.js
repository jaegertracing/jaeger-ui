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

import * as React from 'react';
import { Col, Divider, Row, Tag } from 'antd';
import { Link } from 'react-router-dom';

import { sortBy } from 'lodash';
import moment from 'moment';

import * as markers from './ResultItem.markers';
import ResultItemTitle from './ResultItemTitle';
import colorGenerator from '../../../utils/color-generator';
import { formatRelativeDate } from '../../../utils/date';

import type { TraceSummary } from '../../../types/search';

import './ResultItem.css';

type Props = {
  durationPercent: number,
  isSelectedForComparison: boolean,
  linkTo: string,
  toggleComparison: string => void,
  trace: TraceSummary,
};

export default class ResultItem extends React.PureComponent<Props> {
  props: Props;

  render() {
    const { durationPercent, isSelectedForComparison, linkTo, toggleComparison, trace } = this.props;
    const { duration, services, timestamp, numberOfErredSpans, numberOfSpans, traceName, traceID } = trace;
    const mDate = moment(timestamp);
    const timeStr = mDate.format('h:mm:ss a');
    const fromNow = mDate.fromNow();
    return (
      <div className="ResultItem">
        <ResultItemTitle
          duration={duration}
          durationPercent={durationPercent}
          isSelectedForComparison={isSelectedForComparison}
          linkTo={linkTo}
          toggleComparison={toggleComparison}
          traceID={traceID}
          traceName={traceName}
        />
        <Link to={linkTo}>
          <Row>
            <Col span={4} className="ub-p2">
              <Tag className="ub-m1" data-test={markers.NUM_SPANS}>
                {numberOfSpans} Span{numberOfSpans > 1 && 's'}
              </Tag>
              {Boolean(numberOfErredSpans) && (
                <Tag className="ub-m1" color="red">
                  {numberOfErredSpans} Error{numberOfErredSpans > 1 && 's'}
                </Tag>
              )}
            </Col>
            <Col span={16} className="ub-p2">
              <ul className="ub-list-reset" data-test={markers.SERVICE_TAGS}>
                {sortBy(services, s => s.name).map(service => {
                  const { name, numberOfSpans: count } = service;
                  return (
                    <li key={name} className="ub-inline-block ub-m1">
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
            <Col span={4} className="ub-p3 ub-tx-right-align">
              {formatRelativeDate(timestamp)}
              <Divider type="vertical" />
              {timeStr.slice(0, -3)}&nbsp;{timeStr.slice(-2)}
              <br />
              <small>{fromNow}</small>
            </Col>
          </Row>
        </Link>
      </div>
    );
  }
}
