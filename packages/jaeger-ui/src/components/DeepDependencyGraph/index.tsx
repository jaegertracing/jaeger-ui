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
import Header from './Header';
import Graph from './Graph';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { fetchedState } from '../../constants';
import { stateKey, TDdgModelParams, TDdgSparseUrlState, TDdgStateEntry } from '../../model/ddg/types';
import { ReduxState } from '../../types';

import './index.css';

type TDispatchProps = {
  fetchDeepDependencyGraph: (query: TDdgModelParams) => void;
};

type TReduxProps = {
  graphState?: TDdgStateEntry;
  urlState: TDdgSparseUrlState;
};

type TOwnProps = {
  history: RouterHistory;
  location: Location;
};

type TProps = TDispatchProps & TReduxProps & TOwnProps;

// export for tests
export class DeepDependencyGraphPageImpl extends Component<TProps> {
  static fetchModelIfStale(props: TProps) {
    const { fetchDeepDependencyGraph, graphState = null } = props;
    // TEMP
    if (!graphState) {
      fetchDeepDependencyGraph({ service: 'focalService', operation: 'focalOperation', start: 0, end: 0 });
    }
  }

  constructor(props: TProps) {
    super(props);
    DeepDependencyGraphPageImpl.fetchModelIfStale(props);
  }

  componentWillReceiveProps(nextProps: TProps) {
    DeepDependencyGraphPageImpl.fetchModelIfStale(nextProps);
  }

  // shouldComponentUpdate is necessary as we don't want the plexus graph to re-render due to a uxStatus change
  shouldComponentUpdate(nextProps: TProps) {
    const updateCauses = [
      'urlState.service',
      'urlState.operation',
      'urlState.start',
      'urlState.end',
      'urlState.visibilityKey',
      'graphState.state',
    ];
    return updateCauses.some(cause => _get(nextProps, cause) !== _get(this.props, cause));
  }

  body = () => {
    const { graphState, urlState } = this.props;
    if (!graphState) return <h1>Enter query above</h1>;
    switch (graphState.state) {
      case fetchedState.DONE:
        return (
          <div className="Ddg--graphWrapper">
            <Graph ddgModel={graphState.model} visEncoding={urlState.visEncoding} />
          </div>
        );
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
    return (
      <div>
        <Header />
        {this.body()}
      </div>
    );
  }
}

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const urlState = getUrlState(ownProps.location.search);
  const graphState = _get(state, [
    'deepDependencyGraph',
    stateKey({ service: 'focalService', operation: 'focalOperation', start: 0, end: 0 }),
  ]);
  // skip using the URL until services and operations are wired up
  // const { service, operation, start, end } = urlState;
  // let graphState: TDdgStateEntry | undefined;
  // if (service && start && end) {
  //   graphState = _get(state, ['deepDependencyGraph', stateKey({ service, operation, start, end })]);
  // }
  return {
    graphState,
    urlState,
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
