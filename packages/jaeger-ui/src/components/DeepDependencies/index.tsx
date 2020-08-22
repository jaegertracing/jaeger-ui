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
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';

import { trackClearOperation, trackFocusPaths, trackHide, trackSetService, trackShow } from './index.track';
import Graph from './Graph';
import Header from './Header';
import SidePanel from './SidePanel';
import { getUrl, getUrlState, sanitizeUrlState, ROUTE_PATH } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { extractUiFindFromState, TExtractUiFindFromStateReturn } from '../common/UiFindInput';
import { getUrl as getSearchUrl } from '../SearchTracePage/url';
import ddgActions from '../../actions/ddg';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { fetchedState } from '../../constants';
import getStateEntryKey from '../../model/ddg/getStateEntryKey';
import GraphModel, { makeGraph } from '../../model/ddg/GraphModel';
import {
  ECheckedStatus,
  EDdgDensity,
  EDirection,
  EViewModifier,
  TDdgModelParams,
  TDdgSparseUrlState,
  TDdgVertex,
} from '../../model/ddg/types';
import { encode, encodeDistance } from '../../model/ddg/visibility-codec';
import { getConfigValue } from '../../utils/config/get-config';
import { ReduxState } from '../../types';
import { TDdgStateEntry } from '../../types/TDdgState';

import './index.css';

export type TDispatchProps = {
  addViewModifier?: (kwarg: TDdgModelParams & { viewModifier: number; visibilityIndices: number[] }) => void;
  fetchDeepDependencyGraph?: (query: TDdgModelParams) => void;
  fetchServices?: () => void;
  fetchServiceServerOps?: (service: string) => void;
  removeViewModifierFromIndices?: (
    kwarg: TDdgModelParams & { viewModifier: number; visibilityIndices: number[] }
  ) => void;
};

export type TReduxProps = TExtractUiFindFromStateReturn & {
  graph: GraphModel | undefined;
  graphState?: TDdgStateEntry;
  serverOpsForService?: Record<string, string[]>;
  services?: string[] | null;
  showOp: boolean;
  urlState: TDdgSparseUrlState;
};

export type TOwnProps = {
  baseUrl: string;
  extraUrlArgs?: { [key: string]: unknown };
  history: RouterHistory;
  location: Location;
  showSvcOpsHeader: boolean;
};

export type TProps = TDispatchProps & TReduxProps & TOwnProps;

type TState = {
  selectedVertex?: TDdgVertex;
};

// export for tests
export class DeepDependencyGraphPageImpl extends React.PureComponent<TProps, TState> {
  static defaultProps = {
    showSvcOpsHeader: true,
    baseUrl: ROUTE_PATH,
  };

  static fetchModelIfStale(props: TProps) {
    const { fetchDeepDependencyGraph, graphState = null, urlState } = props;
    const { service, operation } = urlState;
    if (!graphState && service && fetchDeepDependencyGraph) {
      fetchDeepDependencyGraph({ service, operation, start: 0, end: 0 });
    }
  }

  state: TState = {};

  constructor(props: TProps) {
    super(props);
    DeepDependencyGraphPageImpl.fetchModelIfStale(props);

    const { fetchServices, fetchServiceServerOps, serverOpsForService, services, urlState } = props;
    const { service } = urlState;

    if (!services && fetchServices) {
      fetchServices();
    }
    if (
      service &&
      serverOpsForService &&
      !Reflect.has(serverOpsForService, service) &&
      fetchServiceServerOps
    ) {
      fetchServiceServerOps(service);
    }
  }

  componentDidUpdate() {
    DeepDependencyGraphPageImpl.fetchModelIfStale(this.props);
  }

  clearOperation = () => {
    trackClearOperation();
    this.updateUrlState({ operation: undefined });
  };

  focusPathsThroughVertex = (vertexKey: string) => {
    const elems = this.getVisiblePathElems(vertexKey);
    if (!elems) return;

    trackFocusPaths();
    const indices = ([] as number[]).concat(
      ...elems.map(({ memberOf }) => memberOf.members.map(({ visibilityIdx }) => visibilityIdx))
    );
    this.updateUrlState({ visEncoding: encode(indices) });
  };

  getGenerationVisibility = (vertexKey: string, direction: EDirection): ECheckedStatus | null => {
    const { graph, urlState } = this.props;
    if (graph) {
      return graph.getGenerationVisibility(vertexKey, direction, urlState.visEncoding);
    }
    return null;
  };

  getVisiblePathElems = (key: string) => {
    const { graph, urlState } = this.props;
    if (graph) {
      return graph.getVertexVisiblePathElems(key, urlState.visEncoding);
    }
    return undefined;
  };

  hideVertex = (vertexKey: string) => {
    const { graph, urlState } = this.props;
    if (!graph) return;

    const visEncoding = graph.getVisWithoutVertex(vertexKey, urlState.visEncoding);
    if (!visEncoding) return;

    trackHide();
    this.updateUrlState({ visEncoding });
  };

  setDecoration = (decoration: string | undefined) => this.updateUrlState({ decoration });

  setDensity = (density: EDdgDensity) => this.updateUrlState({ density });

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
    const { fetchServiceServerOps, serverOpsForService } = this.props;
    if (serverOpsForService && !Reflect.has(serverOpsForService, service) && fetchServiceServerOps) {
      fetchServiceServerOps(service);
    }
    this.updateUrlState({ operation: undefined, service, visEncoding: undefined });
    trackSetService();
  };

  setViewModifier = (visibilityIndices: number[], viewModifier: EViewModifier, enable: boolean) => {
    const { addViewModifier, graph, removeViewModifierFromIndices, urlState } = this.props;
    const fn = enable ? addViewModifier : removeViewModifierFromIndices;
    const { service, operation } = urlState;
    if (!fn || !graph || !service) return;
    fn({
      operation,
      service,
      viewModifier,
      visibilityIndices,
      end: 0,
      start: 0,
    });
  };

  selectVertex = (selectedVertex?: TDdgVertex) => {
    this.setState({ selectedVertex });
  };

  showVertices = (vertexKeys: string[]) => {
    const { graph, urlState } = this.props;
    const { visEncoding } = urlState;
    if (!graph) return;
    this.updateUrlState({ visEncoding: graph.getVisWithVertices(vertexKeys, visEncoding) });
  };

  toggleShowOperations = (enable: boolean) => this.updateUrlState({ showOp: enable });

  updateGenerationVisibility = (vertexKey: string, direction: EDirection) => {
    const { graph, urlState } = this.props;
    if (!graph) return;

    const result = graph.getVisWithUpdatedGeneration(vertexKey, direction, urlState.visEncoding);
    if (!result) return;

    const { visEncoding, update } = result;
    if (update === ECheckedStatus.Empty) trackHide(direction);
    else trackShow(direction);
    this.updateUrlState({ visEncoding });
  };

  updateUrlState = (newValues: Partial<TDdgSparseUrlState>) => {
    const { baseUrl, extraUrlArgs, graphState, history, uiFind, urlState } = this.props;
    const getUrlArg = { uiFind, ...urlState, ...newValues, ...extraUrlArgs };
    const hash = _get(graphState, 'model.hash');
    if (hash) getUrlArg.hash = hash;
    history.push(getUrl(getUrlArg, baseUrl));
  };

  render() {
    const { selectedVertex } = this.state;
    const {
      baseUrl,
      extraUrlArgs,
      graph,
      graphState,
      serverOpsForService,
      services,
      showOp,
      uiFind,
      urlState,
      showSvcOpsHeader,
    } = this.props;
    const { density, operation, service, visEncoding } = urlState;
    const distanceToPathElems =
      graphState && graphState.state === fetchedState.DONE ? graphState.model.distanceToPathElems : undefined;
    const uiFindMatches = graph && graph.getVisibleUiFindMatches(uiFind, visEncoding);
    const hiddenUiFindMatches = graph && graph.getHiddenUiFindMatches(uiFind, visEncoding);

    let content: React.ReactElement | null = null;
    let wrapperClassName: string = '';
    if (!graphState) {
      content = <h1>Enter query above</h1>;
    } else if (graphState.state === fetchedState.DONE && graph) {
      const { edges, vertices } = graph.getVisible(visEncoding);
      const { viewModifiers } = graphState;
      const { edges: edgesViewModifiers, vertices: verticesViewModifiers } = graph.getDerivedViewModifiers(
        visEncoding,
        viewModifiers
      );
      if (vertices.length > 1) {
        wrapperClassName = 'is-horizontal';
        // TODO: using `key` here is a hack, debug digraph to fix the underlying issue
        content = (
          <>
            <Graph
              key={JSON.stringify({ density, showOp, service, operation, visEncoding })}
              baseUrl={baseUrl}
              density={density}
              edges={edges}
              edgesViewModifiers={edgesViewModifiers}
              extraUrlArgs={extraUrlArgs}
              focusPathsThroughVertex={this.focusPathsThroughVertex}
              getGenerationVisibility={this.getGenerationVisibility}
              getVisiblePathElems={this.getVisiblePathElems}
              hideVertex={this.hideVertex}
              selectVertex={this.selectVertex}
              setOperation={this.setOperation}
              setViewModifier={this.setViewModifier}
              uiFindMatches={uiFindMatches}
              updateGenerationVisibility={this.updateGenerationVisibility}
              vertices={vertices}
              verticesViewModifiers={verticesViewModifiers}
            />
            <SidePanel
              clearSelected={this.selectVertex}
              selectDecoration={this.setDecoration}
              selectedDecoration={urlState.decoration}
              selectedVertex={selectedVertex}
            />
          </>
        );
      } else if (
        graphState.model.distanceToPathElems.has(-1) ||
        graphState.model.distanceToPathElems.has(1)
      ) {
        content = (
          <>
            <h1 className="Ddg--center">There is nothing visible to show</h1>
            <p className="Ddg--center">Select at least one hop to view</p>
          </>
        );
      } else {
        const lookback = getConfigValue('search.maxLookback.value');
        const checkLink = getSearchUrl({
          lookback,
          minDuration: '0ms',
          operation,
          service,
          tags: '{"span.kind":"server"}',
        });
        content = (
          <>
            <h1 className="Ddg--center">There are no dependencies</h1>
            <p className="Ddg--center">
              No traces were found that contain {service}
              {operation && `:${operation}`} and any other service where span.kind is &lsquo;server&rsquo;.
            </p>
            <p className="Ddg--center">
              <a href={checkLink}>Confirm by searching</a>
            </p>
          </>
        );
      }
    } else if (graphState.state === fetchedState.LOADING) {
      content = <LoadingIndicator centered className="u-mt-vast" />;
    } else if (graphState.state === fetchedState.ERROR) {
      content = (
        <>
          <ErrorMessage error={graphState.error} className="ub-m4" />
          <p className="Ddg--center">If you are using an adblocker, whitelist Jaeger and retry.</p>
        </>
      );
    } else {
      content = (
        <>
          <h1 className="Ddg--center">Unknown graphState:</h1>
          <p className="Ddg--center">{JSON.stringify(graphState, null, 2)}</p>
        </>
      );
    }

    return (
      <div className="Ddg">
        <div>
          <Header
            clearOperation={this.clearOperation}
            density={density}
            distanceToPathElems={distanceToPathElems}
            hiddenUiFindMatches={hiddenUiFindMatches}
            operation={operation}
            operations={serverOpsForService && serverOpsForService[service || '']}
            service={service}
            services={services}
            setDensity={this.setDensity}
            setDistance={this.setDistance}
            setOperation={this.setOperation}
            setService={this.setService}
            showOperations={showOp}
            showParameters={showSvcOpsHeader}
            showVertices={this.showVertices}
            toggleShowOperations={this.toggleShowOperations}
            uiFindCount={uiFind ? uiFindMatches && uiFindMatches.size : undefined}
            visEncoding={visEncoding}
          />
        </div>
        <div className={`Ddg--graphWrapper ${wrapperClassName}`}>{content}</div>
      </div>
    );
  }
}

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  const { services: stServices } = state;
  const { services, serverOpsForService } = stServices;
  const urlState = getUrlState(ownProps.location.search);
  const { density, operation, service, showOp: urlStateShowOp } = urlState;
  const showOp = urlStateShowOp !== undefined ? urlStateShowOp : operation !== undefined;
  let graphState: TDdgStateEntry | undefined;
  if (service) {
    graphState = _get(state.ddg, getStateEntryKey({ service, operation, start: 0, end: 0 }));
  }
  let graph: GraphModel | undefined;
  if (graphState && graphState.state === fetchedState.DONE) {
    graph = makeGraph(graphState.model, showOp, density);
  }
  return {
    graph,
    graphState,
    serverOpsForService,
    services,
    showOp,
    urlState: sanitizeUrlState(urlState, _get(graphState, 'model.hash')),
    ...extractUiFindFromState(state),
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchDeepDependencyGraph, fetchServiceServerOps, fetchServices } = bindActionCreators(
    jaegerApiActions,
    dispatch
  );
  const { addViewModifier, removeViewModifierFromIndices } = bindActionCreators(ddgActions, dispatch);

  return {
    addViewModifier,
    fetchDeepDependencyGraph,
    fetchServiceServerOps,
    fetchServices,
    removeViewModifierFromIndices,
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DeepDependencyGraphPageImpl);
