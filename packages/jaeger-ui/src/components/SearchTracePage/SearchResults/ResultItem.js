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
import { Link } from 'react-router-dom';

import { sortBy } from 'lodash';
import moment from 'moment';

import * as markers from './ResultItem.markers';
import ResultItemTitle from './ResultItemTitle';
import colorGenerator from '../../../utils/color-generator';
import { formatRelativeDate } from '../../../utils/date';

import type { Trace } from '../../../types/trace';

import './ResultItem.css';

type Props = {
  durationPercent: number,
  isInDiffCohort: boolean,
  linkTo: string,
  toggleComparison: string => void,
  trace: Trace,
  disableComparision: boolean,
};

const isErrorTag = ({ key, value }) => key === 'error' && (value === true || value === 'true');

export default class ResultItem extends React.PureComponent<Props> {
  props: Props;

  render() {
    const {
      disableComparision,
      durationPercent,
      isInDiffCohort,
      linkTo,
      toggleComparison,
      trace,
    } = this.props;
    const { duration, services, startTime, spans, traceName, traceID } = trace;
    const mDate = moment(startTime / 1000);
    const timeStr = mDate.format('h:mm:ss a');
    const fromNow = mDate.fromNow();
    const numSpans = spans.length;
    const numErredSpans = spans.filter(sp => sp.tags.some(isErrorTag)).length;
    return (
      <div className="ub-pt3">
        <div className="ResultItem">
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
            <div className="ant-row">
              <div className="ant-col-4 ub-p2">
                <div className="ant-tag ub-m1" data-test={markers.NUM_SPANS}>
                  {numSpans} Span{numSpans > 1 && 's'}
                </div>
                {Boolean(numErredSpans) && (
                  <div className="ant-tag ant-tag-red ub-m1">
                    {numErredSpans} Error{numErredSpans > 1 && 's'}
                  </div>
                )}
              </div>
              <div className="ant-col-16 ub-p2">
                <ul className="ub-list-reset" data-test={markers.SERVICE_TAGS}>
                  {sortBy(services, s => s.name).map(service => {
                    const { name, numberOfSpans: count } = service;
                    return (
                      <li
                        key={name}
                        className="ResultItem--serviceTag"
                        style={{ borderLeftColor: colorGenerator.getColorByKey(name) }}
                      >
                        {name} <span className="ResultItem--serviceCount">({count})</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="ant-col-4 ub-p3 ub-tx-right-align">
                {formatRelativeDate(startTime / 1000)}
                <div className="ant-divider ant-divider-vertical" />
                {timeStr.slice(0, -3)}&nbsp;{timeStr.slice(-2)}
                <br />
                <small>{fromNow}</small>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }
}
