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

import { getUrl, getUrlState } from './url';
import Header from './Header';
import Graph from './Graph';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { extractUiFindFromState, TExtractUiFindFromStateReturn } from '../common/UiFindInput';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { fetchedState, TOP_NAV_HEIGHT } from '../../constants';
import getDdgModelKey from '../../model/ddg/getDdgModelKey';
import GraphModel, { makeGraph } from '../../model/ddg/GraphModel';
import { EDirection, TDdgModelParams, TDdgSparseUrlState, EDdgDensity } from '../../model/ddg/types';
import { encodeDistance } from '../../model/ddg/visibility-codec';
import { ReduxState } from '../../types';
import { TDdgStateEntry } from '../../types/TDdgState';

import './index.css';

type TDispatchProps = {
  fetchDeepDependencyGraph: (query: TDdgModelParams) => void;
  fetchServices: () => void;
  fetchServiceOperations: (service: string) => void;
};

type TReduxProps = TExtractUiFindFromStateReturn & {
  graph: GraphModel | undefined;
  graphState?: TDdgStateEntry;
  operationsForService: Record<string, string[]>;
  services?: string[] | null;
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
    const { fetchDeepDependencyGraph, graphState = null, urlState } = props;
    const { service, operation } = urlState;
    // backend temporarily requires service and operation
    if (!graphState && service && operation) {
      fetchDeepDependencyGraph({ service, operation, start: 0, end: 0 });
    }
  }

  headerWrapper: React.RefObject<HTMLDivElement> = React.createRef();

  constructor(props: TProps) {
    super(props);
    DeepDependencyGraphPageImpl.fetchModelIfStale(props);

    const { fetchServices, fetchServiceOperations, operationsForService, services, urlState } = props;
    const { service } = urlState;

    if (!services) {
      fetchServices();
    }
    if (service && !Reflect.has(operationsForService, service)) {
      fetchServiceOperations(service);
    }
  }

  componentWillReceiveProps(nextProps: TProps) {
    /* istanbul ignore next */
    DeepDependencyGraphPageImpl.fetchModelIfStale(nextProps);
  }

  // shouldComponentUpdate is necessary as we don't want the plexus graph to re-render due to a uxStatus change
  shouldComponentUpdate(nextProps: TProps) {
    const updateCauses = [
      'graphState.state',
      'operationsForService',
      'services',
      'uiFind',
      'urlState.density',
      'urlState.end',
      'urlState.operation',
      'urlState.service',
      'urlState.showOp',
      'urlState.start',
      'urlState.visEncoding',
    ];
    return updateCauses.some(cause => _get(nextProps, cause) !== _get(this.props, cause));
  }

  setDistance = (distance: number, direction: EDirection) => {
    const { graphState } = this.props;
    const { visEncoding } = this.props.urlState;

    if (graphState && graphState.state === fetchedState.DONE) {
      const { model: ddgModel } = graphState;

      this.updateUrlState({
        visEncoding: encodeDistance({
          ddgModel,
          direction,
          distance,
          prevVisEncoding: visEncoding,
        }),
      });
    }
  };

  setOperation = (operation: string) => {
    this.updateUrlState({ operation, visEncoding: undefined });
  };

  setService = (service: string) => {
    const { fetchServiceOperations, operationsForService } = this.props;
    if (!Reflect.has(operationsForService, service)) {
      fetchServiceOperations(service);
    }
    this.updateUrlState({ operation: undefined, service, visEncoding: undefined });
  };

  setDensity = (density: EDdgDensity) => this.updateUrlState({ density });

  toggleShowOperations = (enable: boolean) => this.updateUrlState({ showOp: enable });

  updateUrlState = (newValues: Partial<TDdgSparseUrlState>) => {
    const { uiFind, urlState, history } = this.props;
    history.push(getUrl({ uiFind, ...urlState, ...newValues }));
  };

  render() {
    const { graph, graphState, operationsForService, services, uiFind, urlState } = this.props;
    const { density, operation, service, showOp, visEncoding } = urlState;
    const distanceToPathElems =
      graphState && graphState.state === fetchedState.DONE ? graphState.model.distanceToPathElems : undefined;
    const uiFindMatches = graph && graph.getVisibleUiFindMatches(uiFind, visEncoding);

    let content: React.ReactElement | null = null;
    if (!graphState) {
      content = <h1>Enter query above</h1>;
    } else if (graphState.state === fetchedState.DONE && graph) {
      const { edges, vertices } = graph.getVisible(visEncoding);
      // TODO: using `key` here is a hack, debug digraph to fix the underlying issue
      content = (
        <Graph
          key={JSON.stringify(urlState)}
          edges={edges}
          getVisiblePathElems={(key: string) => graph.getVisiblePathElems(key, visEncoding)}
          uiFindMatches={uiFindMatches}
          vertices={vertices}
        />
      );
    } else if (graphState.state === fetchedState.LOADING) {
      content = <LoadingIndicator centered className="u-mt-vast" />;
    } else if (graphState.state === fetchedState.ERROR) {
      content = <ErrorMessage error={graphState.error} />;
    }
    if (!content) {
      content = (
        <div>
          <h1>Unknown graphState:</h1>
          <p>${JSON.stringify(graphState)}</p>
        </div>
      );
    }

    return (
      <div>
        <div ref={this.headerWrapper}>
          <Header
            density={density}
            distanceToPathElems={distanceToPathElems}
            operation={operation}
            operations={operationsForService[service || '']}
            service={service}
            services={services}
            setDensity={this.setDensity}
            setDistance={this.setDistance}
            setOperation={this.setOperation}
            setService={this.setService}
            showOperations={showOp}
            toggleShowOperations={this.toggleShowOperations}
            uiFindCount={uiFind ? uiFindMatches && uiFindMatches.size : undefined}
            visEncoding={visEncoding}
          />
        </div>
        <div
          className="Ddg--graphWrapper"
          style={{
            top: this.headerWrapper.current
              ? this.headerWrapper.current.offsetHeight + this.headerWrapper.current.offsetTop
              : TOP_NAV_HEIGHT,
          }}
        >
          {content}
        </div>
      </div>
    );
  }
}

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const { services: stServices } = state;
  const { services, operationsForService } = stServices;
  const urlState = getUrlState(ownProps.location.search);
  const { density, operation, service, showOp } = urlState;
  let graphState: TDdgStateEntry | undefined;
  // backend temporarily requires service and operation
  // if (service) {
  if (service && operation) {
    graphState = _get(state, [
      'deepDependencyGraph',
      getDdgModelKey({ service, operation, start: 0, end: 0 }),
    ]);
  }
  let graph: GraphModel | undefined;
  if (graphState && graphState.state === fetchedState.DONE) {
    graph = makeGraph(graphState.model, showOp, density);
  }
  return {
    graph,
    graphState,
    services,
    operationsForService,
    urlState,
    ...extractUiFindFromState(state),
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchDeepDependencyGraph, fetchServiceOperations, fetchServices } = bindActionCreators(
    jaegerApiActions,
    dispatch
  );

  return { fetchDeepDependencyGraph, fetchServiceOperations, fetchServices };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DeepDependencyGraphPageImpl);
