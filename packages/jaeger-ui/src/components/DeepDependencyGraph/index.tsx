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

import React, { Component } from 'react';
import { History as RouterHistory, Location } from 'history';
import _get from 'lodash/get';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';

import { getUrlState } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import Header from './Header';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { fetchedState } from '../../constants';
import { stateKey, TDdgActionMeta, TDdgStateEntry } from '../../model/ddg/types';
import { ReduxState } from '../../types';

// import './index.css';

type TDispatchProps = {
  fetchDeepDependencyGraph: (query: TDdgActionMeta['query']) => void;
};

type TReduxProps = {
  end?: number;
  graphState?: TDdgStateEntry;
  operation?: string;
  service?: string;
  start?: number;
};

type TOwnProps = {
  history: RouterHistory;
  location: Location;
};

type TProps = TDispatchProps & TReduxProps & TOwnProps;

// export for tests
export class DeepDependencyGraphPageImpl extends Component<TProps> {
  // shouldComponentUpdate is necessary as we don't want the plexus graph to re-render due to a uxStatus change
  shouldComponentUpdate(nextProps: TProps) {
    const updateCauses = [
      'service',
      'operation',
      'start',
      'end',
      // TODO: add visibility check once graph is interactable
      'graphState.state',
    ];

    return updateCauses.some(cause => _get(nextProps, cause) !== _get(this.props, cause));
  }

  body = () => {
    const { graphState } = this.props;
    if (!graphState) return <h1>Enter query above</h1>;
    switch (graphState.state) {
      case fetchedState.DONE:
        return <h1>Loaded</h1>;
      case fetchedState.LOADING:
        return <LoadingIndicator centered />;
      case fetchedState.ERROR:
        return <ErrorMessage error={graphState.error} />;
      default:
        return (
          <div>
            <h1>Unknown graphState:</h1>
            <p>${JSON.stringify(graphState)}</p>
          </div>
        );
    }
  };

  render() {
    const { service, operation, start, end, fetchDeepDependencyGraph, history, location } = this.props;
    return (
      <div>
        <Header
          service={service}
          operation={operation}
          start={start}
          end={end}
          fetchDeepDependencyGraph={fetchDeepDependencyGraph}
          history={history}
          location={location}
        />
        {this.body()}
      </div>
    );
  }
}

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const { service, operation, start, end } = getUrlState(ownProps.location.search);
  let graphState: TDdgStateEntry | undefined;
  if (service && start && end) {
    graphState = _get(state, ['deepDependencyGraph', stateKey({ service, operation, start, end })]);
  }

  return {
    service,
    operation,
    start,
    end,
    graphState,
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchDeepDependencyGraph } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchDeepDependencyGraph };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DeepDependencyGraphPageImpl);
