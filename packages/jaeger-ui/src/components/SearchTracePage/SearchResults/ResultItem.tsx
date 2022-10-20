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

import IoAlert from 'react-icons/lib/io/alert';

import { trackConversions, EAltViewActions } from './index.track';
import * as markers from './ResultItem.markers';
import ResultItemTitle from './ResultItemTitle';
import colorGenerator from '../../../utils/color-generator';
import { formatRelativeDate } from '../../../utils/date';

import { KeyValuePair, Trace } from '../../../types/trace';

import './ResultItem.css';

type Props = {
  durationPercent: number;
  isInDiffCohort: boolean;
  linkTo: string;
  toggleComparison: (traceID: string) => void;
  trace: Trace;
  disableComparision: boolean;
};

type State = {
  erroredServices: Set<string>;
  numSpans: number;
  numErredSpans: number;
  timeStr: string;
  fromNow: string | boolean;
};

const isErrorTag = ({ key, value }: KeyValuePair) => key === 'error' && (value === true || value === 'true');
const trackTraceConversions = () => trackConversions(EAltViewActions.Traces);

export default class ResultItem extends React.PureComponent<Props, State> {
  constructor(props: Props, state: State) {
    super(props, state);
    const { startTime, spans } = props.trace;

    const mDate = moment(startTime / 1000);

    const erroredServices: Set<string> = new Set<string>();

    const numErredSpans = spans.filter(sp => {
      const hasError = sp.tags.some(isErrorTag);
      if (hasError) {
        erroredServices.add(sp.process.serviceName);
      }
      return hasError;
    }).length;

    this.state = {
      numSpans: spans.length,
      timeStr: mDate.format('h:mm:ss a'),
      fromNow: mDate.fromNow(),
      numErredSpans,
      erroredServices,
    };
  }

  render() {
    const {
      disableComparision,
      durationPercent,
      isInDiffCohort,
      linkTo,
      toggleComparison,
      trace,
    } = this.props;
    const { duration, services, startTime, traceName, traceID } = trace;
    return (
      <div className="ResultItem" onClick={trackTraceConversions} role="button">
        <ResultItemTitle
          duration={duration}
          durationPercent={durationPercent}
          isInDiffCohort={isInDiffCohort}
          linkTo={linkTo}
          toggleComparison={toggleComparison}
          traceID={traceID}
          traceName={traceName}
          disableComparision={disableComparision}
        />
        <Link to={linkTo}>
          <Row>
            <Col span={4} className="ub-p2">
              <Tag className="ub-m1" data-test={markers.NUM_SPANS}>
                {this.state.numSpans} Span{this.state.numSpans > 1 && 's'}
              </Tag>
              {Boolean(this.state.numErredSpans) && (
                <Tag className="ub-m1" color="red">
                  {this.state.numErredSpans} Error{this.state.numErredSpans > 1 && 's'}
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
                        {this.state.erroredServices.has(name) && (
                          <IoAlert className="ResultItem--errorIcon" />
                        )}
                        {name} ({count})
                      </Tag>
                    </li>
                  );
                })}
              </ul>
            </Col>
            <Col span={4} className="ub-p3 ub-tx-right-align">
              {formatRelativeDate(startTime / 1000)}
              <Divider type="vertical" />
              {this.state.timeStr.slice(0, -3)}&nbsp;{this.state.timeStr.slice(-2)}
              <br />
              <small>{this.state.fromNow}</small>
            </Col>
          </Row>
        </Link>
      </div>
    );
  }
}
