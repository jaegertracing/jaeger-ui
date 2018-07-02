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
import { Popover } from 'antd';

import CohortTable from './CohortTable';
import TraceHeader from './TraceHeader';
import TraceIdInput from './TraceIdInput';

import type { FetchedTrace } from '../../../types';

import './TraceDiffHeader.css';

type Props = {
  a: ?FetchedTrace,
  b: ?FetchedTrace,
  cohort: FetchedTrace[],
  diffSetA: string => void,
  diffSetB: string => void,
};

export default class TraceDiffHeader extends React.PureComponent<Props> {
  props: Props;

  render() {
    console.log(this.props);
    const { a, b, cohort, diffSetA, diffSetB } = this.props;
    const { data: aData = {}, id: aId, state: aState, error: aError } = a || {};
    const { data: bData = {}, id: bId, state: bState, error: bError } = b || {};
    const selection = {
      [aId || '_']: { label: 'A' },
      [bId || '__']: { label: 'B' },
    };
    const cohortTableA = (
      <CohortTable cohort={cohort} current={aId} selectTrace={diffSetA} selection={selection} />
    );
    const cohortTableB = (
      <CohortTable cohort={cohort} current={bId} selectTrace={diffSetB} selection={selection} />
    );
    return (
      <header className="TraecDiffHeader">
        <div className="TraecDiffHeader--labelItem-darkened">
          <h1 className="ub-m0">A</h1>
        </div>
        <Popover
          overlayClassName="TraceDiffHeader--popover"
          trigger="click"
          placement="bottomLeft"
          title={<TraceIdInput selectTrace={diffSetA} />}
          content={cohortTableA}
        >
          <div className="ub-flex u-flex-1">
            <TraceHeader
              duration={aData.duration}
              error={aError}
              startTime={aData.startTime}
              state={aState}
              totalSpans={aData.spans && aData.spans.length}
              traceID={aId}
              traceName={aData.traceName}
            />
          </div>
        </Popover>
        <div className="TraecDiffHeader--labelItem">
          <h2 className="u-tx-muted ub-mx3 ub-my0">VS</h2>
        </div>
        <div className="TraecDiffHeader--labelItem-darkened">
          <h1 className="ub-m0">B</h1>
        </div>
        <Popover
          overlayClassName="TraceDiffHeader--popover"
          trigger="click"
          placement="bottomRight"
          title={<TraceIdInput selectTrace={diffSetB} />}
          content={cohortTableB}
        >
          <div className="ub-flex u-flex-1">
            <TraceHeader
              duration={bData.duration}
              error={bError}
              startTime={bData.startTime}
              state={bState}
              totalSpans={bData.spans && bData.spans.length}
              traceID={bId}
              traceName={bData.traceName}
            />
          </div>
        </Popover>
      </header>
    );
  }
}
