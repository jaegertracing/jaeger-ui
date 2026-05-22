// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import _get from 'lodash/get';
import memoizeOne from 'memoize-one';
import queryString from 'query-string';
import { connect } from 'react-redux';

import { DeepDependencyGraphPageImpl, TReduxProps, useDdgViewModifierBridgeProps } from '.';
import { getUrlState, sanitizeUrlState } from './url';
import { ROUTE_PATH } from '../SearchTracePage/url';
import GraphModel, { makeGraph } from '../../model/ddg/GraphModel';
import { fetchedState } from '../../constants';
import { parseUiFind } from '../common/UiFindInput';
import transformDdgData from '../../model/ddg/transformDdgData';
import transformTracesToPaths from '../../model/ddg/transformTracesToPaths';

import { TDdgStateEntry } from '../../types/TDdgState';
import { FetchedTrace, FetchedState, ReduxState } from '../../types';
import { getCachedTrace } from '../../hooks/useTraceLoading';

// Required for proper memoization of subsequent function calls
const svcOp = memoizeOne((service, operation) => ({ service, operation }));

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const urlState = getUrlState(ownProps.location.search);
  const { density, operation, service, showOp: urlStateShowOp } = urlState;
  const showOp = urlStateShowOp !== undefined ? urlStateShowOp : operation !== undefined;
  let graphState: TDdgStateEntry | undefined;
  let graph: GraphModel | undefined;
  if (service) {
    // Build from current search results only — not from the full React Query cache,
    // which accumulates traces across the SPA lifetime and would bleed across searches.
    const searchResultIds = state.trace.search.results;
    const tracesFromSearch: Record<string, FetchedTrace> = {};
    searchResultIds.forEach(id => {
      const traceData = getCachedTrace(id);
      if (traceData) {
        tracesFromSearch[traceData.traceID] = {
          id: traceData.traceID,
          data: traceData,
          state: fetchedState.DONE as FetchedState,
        };
      }
    });
    const payload = transformTracesToPaths(tracesFromSearch, service, operation);
    graphState = {
      model: transformDdgData(payload, svcOp(service, operation)),
      state: fetchedState.DONE,
    };
    graph = makeGraph(graphState.model, showOp, density);
  }

  return {
    graph,
    graphState,
    showOp,
    urlState: sanitizeUrlState(urlState, _get(graphState, 'model.hash')),
    uiFind: parseUiFind(ownProps.location.search),
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
  const viewModifierProps = useDdgViewModifierBridgeProps();
  const urlArgs = queryString.parse(location.search);
  const { end, start, limit, lookback, maxDuration, minDuration, view } = urlArgs;
  const extraArgs = { end, start, limit, lookback, maxDuration, minDuration, view };

  return (
    // Note: services and serverOps are intentionally empty arrays because this traces view
    // sets showSvcOpsHeader=false, hiding the service/operation selector UI elements.
    <DeepDependencyGraphPageImpl
      baseUrl={ROUTE_PATH}
      extraUrlArgs={extraArgs}
      showSvcOpsHeader={false}
      navigate={navigate}
      services={[]}
      serverOps={[]}
      {...viewModifierProps}
      {...props}
    />
  );
});

TracesDdgImpl.displayName = 'TracesDdgImpl';

export default connect(mapStateToProps)(TracesDdgImpl);
