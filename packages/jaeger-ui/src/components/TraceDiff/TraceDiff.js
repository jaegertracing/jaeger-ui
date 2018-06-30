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
import queryString from 'query-string';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import type { Match } from 'react-router-dom';

import { actions as diffActions } from './duck';
import * as jaegerApiActions from '../../actions/jaeger-api';

import type { FetchedTrace, ReduxState } from '../../types';
import type { TraceDiffState } from '../../types/trace-diff';

type Props = {
  a: ?string,
  b: ?string,
  cohort: string[],
  forceState: TraceDiffState => void,
  tracesData: { [string]: ?FetchedTrace },
  traceDiffState: TraceDiffState,
};

function syncStates(urlSt, reduxSt, forceState) {
  const { a: urlA, b: urlB } = urlSt;
  const { a: reduxA, b: reduxB } = reduxSt;
  if (urlA !== reduxA || urlB !== reduxB) {
    forceState(urlSt);
    return;
  }
  const urlCohort = new Set(urlSt.cohort || []);
  const reduxCohort = new Set(reduxSt.cohort || []);
  if (urlCohort.size !== reduxCohort.size) {
    forceState(urlSt);
    return;
  }
  const needSync = Array.from(urlCohort).some(id => !reduxCohort.has(id));
  if (needSync) {
    forceState(urlSt);
  }
}

export class TraceDiffImpl extends React.PureComponent<Props> {
  props: Props;

  componentDidMount() {
    const { a, b, cohort, forceState, traceDiffState } = this.props;
    syncStates({ a, b, cohort }, traceDiffState, forceState);
  }

  render() {
    const { tracesData } = this.props;
    console.log(this.props, tracesData);
    return 'hgello';
  }
}

// TODO(joe): simplify but do not invalidate the URL
// export for tests
export function mapStateToProps(state: ReduxState, ownProps: { match: Match }) {
  const { a } = ownProps.match.params;
  const { b, cohort: origCohort = [] } = queryString.parse(state.router.location.search);
  const fullCohortSet: Set<string> = new Set([].concat(a, b, origCohort).filter(Boolean));
  const cohort: string[] = Array.from(fullCohortSet);
  const { traces } = state.trace;
  const kvPairs = cohort.map(id => [id, traces[id]]);
  const tracesData: Map<string, ?FetchedTrace> = new Map(kvPairs);
  return {
    a,
    b,
    cohort,
    tracesData,
    traceDiffState: state.traceDiff,
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Function) {
  const { fetchTrace } = bindActionCreators(jaegerApiActions, dispatch);
  const actions = bindActionCreators(diffActions, dispatch);
  return { ...actions, fetchTrace };
}

export default connect(mapStateToProps, mapDispatchToProps)(TraceDiffImpl);
