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

type State = {
  tableVisible: ?('a' | 'b'),
};

export default class TraceDiffHeader extends React.PureComponent<Props, State> {
  props: Props;

  _toggleTableA: boolean => void;
  _toggleTableB: boolean => void;
  _diffSetA: string => void;
  _diffSetB: string => void;

  state = {
    tableVisible: null,
  };

  constructor(props: Props) {
    super(props);
    this._toggleTableA = this._toggleTable.bind(this, 'a');
    this._toggleTableB = this._toggleTable.bind(this, 'b');
    this._diffSetA = this._diffSetTrace.bind(this, 'a');
    this._diffSetB = this._diffSetTrace.bind(this, 'b');
  }

  _toggleTable(which: 'a' | 'b', visible: boolean) {
    const tableVisible = visible ? which : null;
    this.setState({ tableVisible });
  }

  _diffSetTrace(which: 'a' | 'b', id: string) {
    if (which === 'a') {
      this.props.diffSetA(id);
    } else {
      this.props.diffSetB(id);
    }
    this.setState({ tableVisible: null });
  }

  render() {
    const { a, b, cohort } = this.props;
    const { tableVisible } = this.state;
    const { data: aData = {}, id: aId, state: aState, error: aError } = a || {};
    const { data: bData = {}, id: bId, state: bState, error: bError } = b || {};
    const selection = {};
    if (aId) selection[aId] = { label: 'A' };
    if (bId) selection[bId] = { label: 'B' };
    const cohortTableA = (
      <CohortTable cohort={cohort} current={aId} selectTrace={this._diffSetA} selection={selection} />
    );
    const cohortTableB = (
      <CohortTable cohort={cohort} current={bId} selectTrace={this._diffSetB} selection={selection} />
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
          title={<TraceIdInput selectTrace={this._diffSetA} />}
          content={cohortTableA}
          visible={tableVisible === 'a'}
          onVisibleChange={this._toggleTableA}
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
          placement="bottomLeft"
          title={<TraceIdInput selectTrace={this._diffSetB} />}
          content={cohortTableB}
          visible={tableVisible === 'b'}
          onVisibleChange={this._toggleTableB}
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
