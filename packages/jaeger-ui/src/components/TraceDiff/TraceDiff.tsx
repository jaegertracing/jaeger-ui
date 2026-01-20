// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';
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

import parseQuery from '../../utils/parseQuery';
import { validateTraceId } from '../../utils/trace-id-validation';
import withRouteProps from '../../utils/withRouteProps';
import './TraceDiff.css';
import { ValidateError } from '../../types/validate-error';

type TStateProps = {
  a: string | undefined;
  b: string | undefined;
  cohort: string[];
  tracesData: Map<string, FetchedTrace>;
  traceDiffState: TTraceDiffState;
};

type TDispatchProps = {
  fetchMultipleTraces: (ids: string[]) => void;
  setTraceValidationError: (payload: { id: string; validationError: ValidateError }) => void;
  forceState: (state: TTraceDiffState) => void;
};

type TOwnProps = {
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
  setTraceValidationError,
  forceState,
}: TStateProps & TDispatchProps & TOwnProps) {
  const navigate = useNavigate();
  const [graphTopOffset, setGraphTopOffset] = React.useState(TOP_NAV_HEIGHT);
  const headerWrapperElmRef = React.useRef<HTMLDivElement | null>(null);

  const setGraphTopOffsetCallback = React.useCallback(() => {
    if (headerWrapperElmRef.current && headerWrapperElmRef.current.clientHeight !== undefined) {
      const newGraphTopOffset = TOP_NAV_HEIGHT + headerWrapperElmRef.current.clientHeight;
      setGraphTopOffset(prevOffset => {
        if (prevOffset !== newGraphTopOffset) {
          return newGraphTopOffset;
        }
        return prevOffset;
      });
    } else {
      setGraphTopOffset(TOP_NAV_HEIGHT);
    }
  }, []);

  const processProps = React.useCallback(() => {
    syncStates({ a, b, cohort }, traceDiffState, forceState);
    const cohortData = cohort.map(id => tracesData.get(id) || { id, state: null });
    const needForDiffs = cohortData.filter(ft => ft.state == null).map(ft => ft.id);

    const validIds: string[] = [];
    needForDiffs.forEach(id => {
      const validationError = validateTraceId(id);
      if (validationError) {
        setTraceValidationError({ id, validationError });
      } else {
        validIds.push(id);
      }
    });

    if (validIds.length) {
      fetchMultipleTraces(validIds);
    }
  }, [a, b, cohort, traceDiffState, forceState, tracesData, fetchMultipleTraces, setTraceValidationError]);

  const diffSetUrl = React.useCallback(
    (change: { newA?: string | TNil; newB?: string | TNil }) => {
      const { newA, newB } = change;
      const url = getUrl({ a: newA || a, b: newB || b, cohort });
      navigate(url);
    },
    [a, b, cohort, navigate]
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
