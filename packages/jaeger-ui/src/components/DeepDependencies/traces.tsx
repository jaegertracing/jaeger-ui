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
import queryString from 'query-string';
import * as React from 'react';
import { connect } from 'react-redux';
import { ReduxState } from '../../types';
import { getUrlState } from './url';
import { TDdgStateEntry } from '../../types/TDdgState';
import GraphModel, { makeGraph } from '../../model/ddg/GraphModel';
import { fetchedState } from '../../constants';
import { extractUiFindFromState } from '../common/UiFindInput';
import transformDdgData from '../../model/ddg/transformDdgData';
import transformTracesToPaths from '../../model/ddg/transformTracesToPaths';
import { ROUTE_PATH } from '../SearchTracePage/url';
import { DeepDependencyGraphPageImpl, mapDispatchToProps, TOwnProps, TProps, TReduxProps } from '.';

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const { services: stServices, trace } = state;
  const { services, operationsForService } = stServices;
  const urlState = getUrlState(ownProps.location.search);
  const { density, operation, service, showOp } = urlState;
  let graphState: TDdgStateEntry | undefined;
  let graph: GraphModel | undefined;
  if (service) {
    const payload = transformTracesToPaths(trace.traces, service, operation);
    graphState = {
      model: transformDdgData(payload, { service, operation }),
      state: fetchedState.DONE,
      viewModifiers: new Map(),
    };
    graph = makeGraph(graphState.model, showOp, density);
  }

  return {
    graph,
    graphState,
    operationsForService,
    services,
    urlState,
    ...extractUiFindFromState(state),
  };
}

// export for tests
export class TracesDdgImpl extends React.PureComponent<TProps & { showSvcOpsHeader: never; baseUrl: never }> {
  render(): React.ReactNode {
    const { location } = this.props;
    const urlArgs = queryString.parse(location.search);
    const { end, start, limit, lookback, maxDuration, minDuration, view } = urlArgs;
    const extraArgs = { end, start, limit, lookback, maxDuration, minDuration, view };
    return (
      <DeepDependencyGraphPageImpl
        baseUrl={ROUTE_PATH}
        extraUrlArgs={extraArgs}
        showSvcOpsHeader={false}
        {...this.props}
      />
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TracesDdgImpl);
