// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { History as RouterHistory, Location } from 'history';
import { useNavigate } from 'react-router-dom-v5-compat';
import _get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';

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
  TDdgModel,
  TDdgModelParams,
  TDdgSparseUrlState,
  TDdgVertex,
} from '../../model/ddg/types';
import { encode, encodeDistance } from '../../model/ddg/visibility-codec';
import { getConfigValue } from '../../utils/config/get-config';
import { ReduxState } from '../../types';
import { TDdgStateEntry } from '../../types/TDdgState';

import './index.css';
import { ApiError } from '../../types/api-error';
import withRouteProps from '../../utils/withRouteProps';

interface IDoneState {
  state: typeof fetchedState.DONE;
  model: TDdgModel;
  viewModifiers: Map<number, number>;
}
interface IErrorState {
  state: typeof fetchedState.ERROR;
  error: ApiError;
}

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
  navigate: ReturnType<typeof useNavigate>;
  location: Location;
  showSvcOpsHeader: boolean;
};

export type TProps = TDispatchProps & TReduxProps & TOwnProps;

// export for tests
export const DeepDependencyGraphPageImpl: React.FC<TProps> = ({
  addViewModifier,
  baseUrl = ROUTE_PATH,
  extraUrlArgs,
  fetchDeepDependencyGraph,
  fetchServiceServerOps,
  fetchServices,
  graph,
  graphState,
  navigate,
  location,
  removeViewModifierFromIndices,
  serverOpsForService,
  services,
  showOp,
  showSvcOpsHeader = true,
  uiFind,
  urlState,
}) => {
  const [selectedVertex, setSelectedVertex] = useState<TDdgVertex | undefined>(undefined);

  const updateUrlState = useCallback(
    (newValues: Partial<TDdgSparseUrlState>) => {
      const getUrlArg = { uiFind, ...urlState, ...newValues, ...extraUrlArgs };
      const hash = _get(graphState, 'model.hash');
      if (hash) getUrlArg.hash = hash;
      navigate(getUrl(getUrlArg, baseUrl));
    },
    [baseUrl, extraUrlArgs, graphState, navigate, uiFind, urlState]
  );

  // Fetch model if stale
  const fetchModelIfStale = useCallback(() => {
    const { service, operation } = urlState;
    if (!graphState && service && fetchDeepDependencyGraph) {
      fetchDeepDependencyGraph({ service, operation, start: 0, end: 0 });
    }
  }, [fetchDeepDependencyGraph, graphState, urlState]);

  // Initial fetch on mount and when dependencies change
  useEffect(() => {
    fetchModelIfStale();
  }, [fetchModelIfStale]);

  // Fetch services if needed
  useEffect(() => {
    if (!services && fetchServices) {
      fetchServices();
    }
  }, [services, fetchServices]);

  // Fetch server ops for service if needed
  useEffect(() => {
    const { service } = urlState;
    if (
      service &&
      serverOpsForService &&
      !Reflect.has(serverOpsForService, service) &&
      fetchServiceServerOps
    ) {
      fetchServiceServerOps(service);
    }
  }, [urlState, serverOpsForService, fetchServiceServerOps]);

  const clearOperation = useCallback(() => {
    trackClearOperation();
    updateUrlState({ operation: undefined });
  }, [updateUrlState]);

  const getVisiblePathElems = useCallback(
    (key: string) => {
      if (graph) {
        return graph.getVertexVisiblePathElems(key, urlState.visEncoding);
      }
      return undefined;
    },
    [graph, urlState.visEncoding, updateUrlState]
  );

  const focusPathsThroughVertex = useCallback(
    (vertexKey: string) => {
      const elems = getVisiblePathElems(vertexKey);
      if (!elems) return;

      trackFocusPaths();
      const indices = ([] as number[]).concat(
        ...elems.map(({ memberOf }) => memberOf.members.map(({ visibilityIdx }) => visibilityIdx))
      );
      updateUrlState({ visEncoding: encode(indices) });
    },
    [getVisiblePathElems, updateUrlState]
  );

  const getGenerationVisibility = useCallback(
    (vertexKey: string, direction: EDirection): ECheckedStatus | null => {
      if (graph) {
        return graph.getGenerationVisibility(vertexKey, direction, urlState.visEncoding);
      }
      return null;
    },
    [graph, urlState.visEncoding]
  );

  const hideVertex = useCallback(
    (vertexKey: string) => {
      if (!graph) return;

      const visEncoding = graph.getVisWithoutVertex(vertexKey, urlState.visEncoding);
      if (!visEncoding) return;

      trackHide();
      updateUrlState({ visEncoding });
    },
    [graph, urlState.visEncoding]
  );

  const setDecoration = useCallback(
    (decoration: string | undefined) => {
      updateUrlState({ decoration });
    },
    [updateUrlState]
  );

  const setDensity = useCallback(
    (density: EDdgDensity) => {
      updateUrlState({ density });
    },
    [updateUrlState]
  );

  const setDistance = useCallback(
    (distance: number, direction: EDirection) => {
      const { visEncoding } = urlState;

      if (graphState && graphState.state === fetchedState.DONE) {
        const { model: ddgModel } = graphState as IDoneState;

        updateUrlState({
          visEncoding: encodeDistance({
            ddgModel,
            direction,
            distance,
            prevVisEncoding: visEncoding,
          }),
        });
      }
    },
    [graphState, urlState]
  );

  const setOperation = useCallback((operation: string) => {
    updateUrlState({ operation, visEncoding: undefined });
  }, []);

  const setService = useCallback(
    (service: string) => {
      if (serverOpsForService && !Reflect.has(serverOpsForService, service) && fetchServiceServerOps) {
        fetchServiceServerOps(service);
      }
      updateUrlState({ operation: undefined, service, visEncoding: undefined });
      trackSetService();
    },
    [serverOpsForService, fetchServiceServerOps]
  );

  const setViewModifier = useCallback(
    (visibilityIndices: number[], viewModifier: EViewModifier, enable: boolean) => {
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
    },
    [addViewModifier, removeViewModifierFromIndices, urlState, graph]
  );

  const selectVertex = useCallback((vertex?: TDdgVertex) => {
    setSelectedVertex(vertex);
  }, []);

  const showVertices = useCallback(
    (vertexKeys: string[]) => {
      const { visEncoding } = urlState;
      if (!graph) return;
      updateUrlState({ visEncoding: graph.getVisWithVertices(vertexKeys, visEncoding) });
    },
    [graph, urlState]
  );

  const toggleShowOperations = useCallback((enable: boolean) => {
    updateUrlState({ showOp: enable });
  }, []);

  const updateGenerationVisibility = useCallback(
    (vertexKey: string, direction: EDirection) => {
      if (!graph) return;

      const result = graph.getVisWithUpdatedGeneration(vertexKey, direction, urlState.visEncoding);
      if (!result) return;

      const { visEncoding, update } = result;
      if (update === ECheckedStatus.Empty) trackHide(direction);
      else trackShow(direction);
      updateUrlState({ visEncoding });
    },
    [graph, urlState.visEncoding]
  );

  const { density, operation, service, visEncoding } = urlState;
  const distanceToPathElems =
    graphState && graphState.state === fetchedState.DONE
      ? (graphState as IDoneState).model.distanceToPathElems
      : undefined;
  const uiFindMatches = graph && graph.getVisibleUiFindMatches(uiFind, visEncoding);
  const hiddenUiFindMatches = graph && graph.getHiddenUiFindMatches(uiFind, visEncoding);

  let content: React.ReactElement | null = null;
  let wrapperClassName = '';
  if (!graphState) {
    content = <h1>Enter query above</h1>;
  } else if (graphState.state === fetchedState.DONE && graph) {
    const { edges, vertices } = graph.getVisible(visEncoding);
    const { viewModifiers } = graphState as IDoneState;
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
            focusPathsThroughVertex={focusPathsThroughVertex}
            getGenerationVisibility={getGenerationVisibility}
            getVisiblePathElems={getVisiblePathElems}
            hideVertex={hideVertex}
            selectVertex={selectVertex}
            setOperation={setOperation}
            setViewModifier={setViewModifier}
            uiFindMatches={uiFindMatches}
            updateGenerationVisibility={updateGenerationVisibility}
            vertices={vertices}
            verticesViewModifiers={verticesViewModifiers}
          />
          <SidePanel
            clearSelected={selectVertex}
            selectDecoration={setDecoration}
            selectedDecoration={urlState.decoration}
            selectedVertex={selectedVertex}
          />
        </>
      );
    } else if (
      (graphState as IDoneState).model.distanceToPathElems.has(-1) ||
      (graphState as IDoneState).model.distanceToPathElems.has(1)
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
        <ErrorMessage error={(graphState as IErrorState).error} className="ub-m4" />
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
          clearOperation={clearOperation}
          density={density}
          distanceToPathElems={distanceToPathElems}
          hiddenUiFindMatches={hiddenUiFindMatches}
          operation={operation}
          operations={serverOpsForService && serverOpsForService[service || '']}
          service={service}
          services={services}
          setDensity={setDensity}
          setDistance={setDistance}
          setOperation={setOperation}
          setService={setService}
          showOperations={showOp}
          showParameters={showSvcOpsHeader}
          showVertices={showVertices}
          toggleShowOperations={toggleShowOperations}
          uiFindCount={uiFind ? uiFindMatches && uiFindMatches.size : undefined}
          visEncoding={visEncoding}
        />
      </div>
      <div className={`Ddg--graphWrapper ${wrapperClassName}`}>{content}</div>
    </div>
  );
};

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
    graph = makeGraph((graphState as IDoneState).model, showOp, density);
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

// Wrapper component that uses hooks for Redux
const DeepDependencyGraphPageWithHooks: React.FC<TOwnProps> = props => {
  const dispatch = useDispatch<any>();
  const reduxProps = useSelector((state: ReduxState) => mapStateToProps(state, props));

  const dispatchProps: TDispatchProps = {
    addViewModifier: useCallback(
      (kwarg: TDdgModelParams & { viewModifier: number; visibilityIndices: number[] }) => {
        dispatch(ddgActions.addViewModifier(kwarg) as any);
      },
      [dispatch]
    ),
    fetchDeepDependencyGraph: useCallback(
      (query: TDdgModelParams) => {
        dispatch(jaegerApiActions.fetchDeepDependencyGraph(query) as any);
      },
      [dispatch]
    ),
    fetchServiceServerOps: useCallback(
      (service: string) => {
        dispatch(jaegerApiActions.fetchServiceServerOps(service) as any);
      },
      [dispatch]
    ),
    fetchServices: useCallback(() => {
      dispatch(jaegerApiActions.fetchServices() as any);
    }, [dispatch]),
    removeViewModifierFromIndices: useCallback(
      (kwarg: TDdgModelParams & { viewModifier: number; visibilityIndices: number[] }) => {
        dispatch(ddgActions.removeViewModifierFromIndices(kwarg) as any);
      },
      [dispatch]
    ),
  };

  return <DeepDependencyGraphPageImpl {...props} {...reduxProps} {...dispatchProps} />;
};

// Wrap with React.memo since original was PureComponent
const MemoizedDeepDependencyGraphPage = React.memo(DeepDependencyGraphPageWithHooks);

export default withRouteProps(MemoizedDeepDependencyGraphPage);
