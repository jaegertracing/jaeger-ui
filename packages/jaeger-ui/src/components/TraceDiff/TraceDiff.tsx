// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { connect } from 'react-redux';
import { useShallow } from 'zustand/react/shallow';

import { getUrl, TDiffRouteParams, getDiffIds } from './url';
import TraceDiffGraph from './TraceDiffGraph';
import TraceDiffHeader from './TraceDiffHeader';
import { TOP_NAV_HEIGHT } from '../../constants';
import { FetchedTrace, TNil, ReduxState } from '../../types';
import TTraceDiffState from '../../types/TTraceDiffState';
import pluckTruthy from '../../utils/ts/pluckTruthy';
import { useTraces } from '../../hooks/useTraceLoading';

import './TraceDiff.css';
import parseQuery from '../../utils/parseQuery';
import withRouteProps from '../../utils/withRouteProps';
import { useTraceDiffStore } from '../../stores/trace-diff-store';

type TStateProps = {
  a: string | undefined;
  b: string | undefined;
  cohort: string[];
};

type TOwnProps = {
  params: TDiffRouteParams & { id?: string };
  search?: string;
};

function syncStates(
  urlValues: TTraceDiffState,
  reduxValues: TTraceDiffState,
  hydrateCohort: (newState: TTraceDiffState) => void
) {
  const { a: urlA, b: urlB } = urlValues;
  const { a: reduxA, b: reduxB } = reduxValues;
  if ((urlA ?? null) !== (reduxA ?? null) || (urlB ?? null) !== (reduxB ?? null)) {
    hydrateCohort(urlValues);
    return;
  }
  const urlCohort = new Set(urlValues.cohort);
  const reduxCohort = new Set(reduxValues.cohort || []);
  if (urlCohort.size !== reduxCohort.size) {
    hydrateCohort(urlValues);
    return;
  }
  const needSync = Array.from(urlCohort).some(id => !reduxCohort.has(id));
  if (needSync) {
    hydrateCohort(urlValues);
  }
}

export function TraceDiffImpl({ a, b, cohort }: TStateProps & TOwnProps) {
  const tracesData = useTraces(cohort);
  const traceDiffState = useTraceDiffStore(
    useShallow(s => ({
      a: s.a,
      b: s.b,
      cohort: s.cohort,
    }))
  );
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
    syncStates({ a, b, cohort }, traceDiffState, useTraceDiffStore.getState().hydrateCohort);
  }, [a, b, cohort, traceDiffState]);

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
      diffSetUrl({ newA: id });
    },
    [diffSetUrl]
  );

  const diffSetB = React.useCallback(
    (id: string) => {
      diffSetUrl({ newB: id });
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
  let { a, b } = ownProps.params;
  const { id } = ownProps.params;
  if (!a && id) {
    ({ a, b } = getDiffIds(id));
  }
  const { cohort: origCohort = [] } = parseQuery(ownProps.search || '');
  const fullCohortSet: Set<string> = new Set(pluckTruthy([a, b].concat(origCohort)));
  const cohort: string[] = Array.from(fullCohortSet);
  return { a, b, cohort };
}

export default withRouteProps(
  connect<TStateProps, Record<string, never>, TOwnProps, ReduxState>(mapStateToProps)(TraceDiffImpl)
);
