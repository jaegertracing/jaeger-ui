// Copyright (c) 2019 Uber Technologies, Inc.
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
import { History as RouterHistory, Location } from 'history';
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
import { ReduxState } from '../../types';
import { useLocation } from 'react-router-dom-v5-compat';

// Required for proper memoization of subsequent function calls
const svcOp = memoizeOne((service, operation) => ({ service, operation }));

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  // ownProps.location.search !== state.router.location.search
  // Graph displayed only when the state.router.location.search is used, which contains all the params
  // ownProps.location.search contains only the `?view=dgg` param
  // const urlState = getUrlState(ownProps.location.search);
  const urlState = getUrlState(state.router.location.search);

  const { density, operation, service, showOp: urlStateShowOp } = urlState;
  const showOp = urlStateShowOp !== undefined ? urlStateShowOp : operation !== undefined;
  let graphState: TDdgStateEntry | undefined;
  let graph: GraphModel | undefined;
  if (service) {
    const payload = transformTracesToPaths(state.trace.traces, service, operation);
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
  history: RouterHistory;
  location: Location;
};

type TProps = TOwnProps & TReduxProps;

// export for tests
export const TracesDdgImpl: React.FC<TProps> = (props) => {
    const location = useLocation();
    const urlArgs = queryString.parse(location.search);
    const { end, start, limit, lookback, maxDuration, minDuration, view } = urlArgs;
    const extraArgs = { end, start, limit, lookback, maxDuration, minDuration, view };
    return (
      <DeepDependencyGraphPageImpl
        baseUrl={ROUTE_PATH}
        extraUrlArgs={extraArgs}
        showSvcOpsHeader={false}
        {...props}
      />
    );
  }
// }

export default connect(mapStateToProps)(TracesDdgImpl);
