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

// import type { RouterHistory, Match } from 'react-router-dom';
import type { Match } from 'react-router-dom';

import * as jaegerApiActions from '../../actions/jaeger-api';

import type { ReduxState } from '../../types';
import type { Trace } from '../../types/trace';

type Props = {
  a: ?string,
  b: ?string,
  selectedForComparison: string[],
  traces: Trace[],
};

export class TraceDiffImpl extends React.PureComponent<Props> {
  render() {
    console.log(this.props);
    return 'hgello';
  }
}

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: { match: Match }) {
  const { a } = ownProps.match.params;
  const { b, cohort } = queryString.parse(state.router.location.search);
  return {
    a,
    b,
    cohort,
    state,
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Function) {
  const { fetchTrace } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchTrace };
}

export default connect(mapStateToProps, mapDispatchToProps)(TraceDiffImpl);
