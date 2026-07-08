// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import memoizeOne from 'memoize-one';
import queryString from 'query-string';
import { DeepDependencyGraphPageImpl, TReduxProps, useDdgViewModifierBridgeProps } from '.';
import { getUrlState, sanitizeUrlState } from './url';
import { ROUTE_PATH } from '../SearchTracePage/url';
import { makeGraph } from '../../model/ddg/GraphModel';
import { fetchedState } from '../../constants';
import { parseUiFind } from '../common/UiFindInput';
import transformDdgData from '../../model/ddg/transformDdgData';
import transformTracesToPaths from '../../model/ddg/transformTracesToPaths';

import { TDdgStateEntry } from '../../types/TDdgState';
import { FetchedTrace } from '../../types';
import { useTraces } from '../../hooks/useTraceLoading';

// Required for proper memoization of subsequent function calls
const svcOp = memoizeOne((service, operation) => ({ service, operation }));

type TOwnProps = {
  location: Location;
  traceIDs: string[];
};

const TracesDdgImpl: React.FC<TOwnProps> = React.memo(props => {
  const { location, traceIDs } = props;
  const navigate = useNavigate();
  const urlArgs = queryString.parse(location.search);
  const { end, start, limit, lookback, maxDuration, minDuration, view } = urlArgs;
  const extraArgs = { end, start, limit, lookback, maxDuration, minDuration, view };

  const urlState = useMemo(() => getUrlState(location.search), [location.search]);
  const { density, operation, service, showOp: urlStateShowOp } = urlState;
  const showOp = urlStateShowOp !== undefined ? urlStateShowOp : operation !== undefined;

  const tracesData = useTraces(traceIDs);

  const { graphState, graph } = useMemo(() => {
    if (!service) return { graphState: undefined, graph: undefined };

    const tracesFromSearch: Record<string, FetchedTrace> = {};
    tracesData.forEach((fetchedTrace, id) => {
      if (fetchedTrace.data) {
        tracesFromSearch[id] = fetchedTrace;
      }
    });

    const payload = transformTracesToPaths(tracesFromSearch, service, operation);
    const gs: TDdgStateEntry = {
      model: transformDdgData(payload, svcOp(service, operation)),
      state: fetchedState.DONE,
    };
    return { graphState: gs, graph: makeGraph(gs.model, showOp, density) };
  }, [tracesData, service, operation, showOp, density]);

  const modelHash = graphState && graphState.state === fetchedState.DONE ? graphState.model.hash : undefined;
  const viewModifierProps = useDdgViewModifierBridgeProps({ modelHash });
  const sanitizedUrlState = useMemo(() => sanitizeUrlState(urlState, modelHash), [urlState, modelHash]);

  const ddgProps: TReduxProps = {
    graph,
    graphState,
    showOp,
    urlState: sanitizedUrlState,
    uiFind: parseUiFind(location.search),
  };

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
      {...ddgProps}
      {...props}
    />
  );
});

TracesDdgImpl.displayName = 'TracesDdgImpl';

export default TracesDdgImpl;
