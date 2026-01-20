// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Location, useNavigate } from 'react-router-dom-v5-compat';
import _get from 'lodash/get';
import memoizeOne from 'memoize-one';
import queryString from 'query-string';
import { connect } from 'react-redux';

import { DeepDependencyGraphPageImpl, TReduxProps } from '.';
import { getUrlState, sanitizeUrlState } from './url';
import { ROUTE_PATH } from '../SearchTracePage/url';
import GraphModel, { makeGraph } from '../../model/ddg/GraphModel';
import { fetchedState } from '../../constants';
import { extractUiFindFromState } from '../common/UiFindInput';
import transformDdgData from '../../model/ddg/transformDdgData';
import transformTracesToPaths from '../../model/ddg/transformTracesToPaths';

import { TDdgStateEntry } from '../../types/TDdgState';
import { FetchedTrace, ReduxState } from '../../types';
import { Trace } from '../../types/trace';
import { IOtelTrace } from '../../types/otel';

// Required for proper memoization of subsequent function calls
const svcOp = memoizeOne((service, operation) => ({ service, operation }));

const mapTracesToOtel = memoizeOne(
  (traces: Record<string, FetchedTrace<Trace>>): Record<string, FetchedTrace<IOtelTrace>> => {
    const result: Record<string, FetchedTrace<IOtelTrace>> = {};
    Object.entries(traces).forEach(([id, trace]) => {
      result[id] = {
        ...trace,
        data: trace.data?.asOtelTrace(),
      };
    });
    return result;
  }
);

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const urlState = getUrlState(ownProps.location.search);
  const { density, operation, service, showOp: urlStateShowOp } = urlState;
  const showOp = urlStateShowOp !== undefined ? urlStateShowOp : operation !== undefined;
  let graphState: TDdgStateEntry | undefined;
  let graph: GraphModel | undefined;
  if (service) {
    const payload = transformTracesToPaths(mapTracesToOtel(state.trace.traces), service, operation);
    graphState = {
      model: transformDdgData(payload, svcOp(service, operation)),
      state: fetchedState.DONE,
      viewModifiers: new Map(),
    };
    graph = makeGraph(graphState.model, showOp, density);
  }

  return {
    graph,
    graphState,
    showOp,
    urlState: sanitizeUrlState(urlState, _get(graphState, 'model.hash')),
    ...extractUiFindFromState(state),
  };
}

type TOwnProps = {
  location: Location;
};

type TracesDdgImplProps = TOwnProps & TReduxProps;

// export for tests
export const TracesDdgImpl: React.FC<TracesDdgImplProps> = React.memo(props => {
  const { location } = props;
  const navigate = useNavigate();
  const urlArgs = queryString.parse(location.search);
  const { end, start, limit, lookback, maxDuration, minDuration, view } = urlArgs;
  const extraArgs = { end, start, limit, lookback, maxDuration, minDuration, view };

  return (
    <DeepDependencyGraphPageImpl
      baseUrl={ROUTE_PATH}
      extraUrlArgs={extraArgs}
      showSvcOpsHeader={false}
      navigate={navigate}
      services={[]}
      serverOps={[]}
      {...props}
    />
  );
});

TracesDdgImpl.displayName = 'TracesDdgImpl';

export default connect(mapStateToProps)(TracesDdgImpl);
