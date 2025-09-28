// Copyright (c) 2018 Uber Technologies, Inc.
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
import { History as RouterHistory } from 'history';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';

import { actions as diffActions } from './duck';
import { getUrl, TDiffRouteParams } from './url';
import TraceDiffGraph from './TraceDiffGraph';
import TraceDiffHeader from './TraceDiffHeader';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { TOP_NAV_HEIGHT } from '../../constants';
import { FetchedTrace, TNil, ReduxState } from '../../types';
import TTraceDiffState from '../../types/TTraceDiffState';
import pluckTruthy from '../../utils/ts/pluckTruthy';

import './TraceDiff.css';
import parseQuery from '../../utils/parseQuery';
import withRouteProps from '../../utils/withRouteProps';

type TStateProps = {
  a: string | undefined;
  b: string | undefined;
  cohort: string[];
  tracesData: Map<string, FetchedTrace>;
  traceDiffState: TTraceDiffState;
};

type TDispatchProps = {
  fetchMultipleTraces: (ids: string[]) => void;
  forceState: (state: TTraceDiffState) => void;
};

type TOwnProps = {
  history: RouterHistory;
  params: TDiffRouteParams;
};

function syncStates(
  urlValues: TTraceDiffState,
  reduxValues: TTraceDiffState,
  forceState: (newState: TTraceDiffState) => void
) {
  const { a: urlA, b: urlB } = urlValues;
  const { a: reduxA, b: reduxB } = reduxValues;
  if (urlA !== reduxA || urlB !== reduxB) {
    forceState(urlValues);
    return;
  }
  const urlCohort = new Set(urlValues.cohort);
  const reduxCohort = new Set(reduxValues.cohort || []);
  if (urlCohort.size !== reduxCohort.size) {
    forceState(urlValues);
    return;
  }
  const needSync = Array.from(urlCohort).some(id => !reduxCohort.has(id));
  if (needSync) {
    forceState(urlValues);
  }
}

export function TraceDiffImpl({
  a,
  b,
  cohort,
  tracesData,
  traceDiffState,
  fetchMultipleTraces,
  forceState,
  history,
}: TStateProps & TDispatchProps & TOwnProps) {
  const [graphTopOffset, setGraphTopOffset] = React.useState(TOP_NAV_HEIGHT);
  const headerWrapperElmRef = React.useRef<HTMLDivElement | null>(null);

  const setGraphTopOffsetCallback = React.useCallback(() => {
    if (headerWrapperElmRef.current) {
      const newGraphTopOffset = TOP_NAV_HEIGHT + headerWrapperElmRef.current.clientHeight;
      if (graphTopOffset !== newGraphTopOffset) {
        setGraphTopOffset(newGraphTopOffset);
      }
    } else {
      setGraphTopOffset(TOP_NAV_HEIGHT);
    }
  }, [graphTopOffset]);

  const processProps = React.useCallback(() => {
    syncStates({ a, b, cohort }, traceDiffState, forceState);
    const cohortData = cohort.map(id => tracesData.get(id) || { id, state: null });
    const needForDiffs = cohortData.filter(ft => ft.state == null).map(ft => ft.id);
    if (needForDiffs.length) {
      fetchMultipleTraces(needForDiffs);
    }
  }, [a, b, cohort, traceDiffState, forceState, tracesData, fetchMultipleTraces]);

  const diffSetUrl = React.useCallback(
    (change: { newA?: string | TNil; newB?: string | TNil }) => {
      const { newA, newB } = change;
      const url = getUrl({ a: newA || a, b: newB || b, cohort });
      history.push(url);
    },
    [a, b, cohort, history]
  );

  const diffSetA = React.useCallback(
    (id: string) => {
      const newA = id.toLowerCase();
      diffSetUrl({ newA });
    },
    [diffSetUrl]
  );

  const diffSetB = React.useCallback(
    (id: string) => {
      const newB = id.toLowerCase();
      diffSetUrl({ newB });
    },
    [diffSetUrl]
  );

  React.useEffect(() => {
    processProps();
  }, [processProps]);

  React.useEffect(() => {
    setGraphTopOffsetCallback();
  }, [setGraphTopOffsetCallback]);

  const traceA = a ? tracesData.get(a) || { id: a } : null;
  const traceB = b ? tracesData.get(b) || { id: b } : null;
  const cohortData: FetchedTrace[] = cohort.map(id => tracesData.get(id) || { id });

  return (
    <React.Fragment>
      <div key="header" ref={headerWrapperElmRef}>
        <TraceDiffHeader
          key="header"
          a={traceA}
          b={traceB}
          cohort={cohortData}
          diffSetA={diffSetA}
          diffSetB={diffSetB}
        />
      </div>
      <div key="graph" className="TraceDiff--graphWrapper" style={{ top: graphTopOffset }}>
        <TraceDiffGraph a={traceA} b={traceB} />
      </div>
    </React.Fragment>
  );
}

// TODO(joe): simplify but do not invalidate the URL
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps) {
  const { a, b } = ownProps.params;
  const { cohort: origCohort = [] } = parseQuery(state.router.location.search);
  const fullCohortSet: Set<string> = new Set(pluckTruthy([a, b].concat(origCohort)));
  const cohort: string[] = Array.from(fullCohortSet);
  const { traces } = state.trace;
  const kvPairs = cohort.map<[string, FetchedTrace]>(id => [id, traces[id] || { id, state: null }]);
  const tracesData: Map<string, FetchedTrace> = new Map(kvPairs);
  return {
    a,
    b,
    cohort,
    tracesData,
    traceDiffState: state.traceDiff,
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch<ReduxState>) {
  const { fetchMultipleTraces } = bindActionCreators(jaegerApiActions, dispatch);
  const { forceState } = bindActionCreators(diffActions, dispatch);
  return { fetchMultipleTraces, forceState };
}

export default withRouteProps(
  connect<TStateProps, TDispatchProps, TOwnProps, ReduxState>(
    mapStateToProps,
    mapDispatchToProps
  )(TraceDiffImpl)
);
