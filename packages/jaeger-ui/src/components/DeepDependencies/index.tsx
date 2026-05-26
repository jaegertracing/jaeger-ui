// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import _get from 'lodash/get';
import { bindActionCreators, Dispatch } from 'redux';
import { connect, useSelector } from 'react-redux';

import { trackClearOperation, trackFocusPaths, trackHide, trackSetService, trackShow } from './index.track';
import Graph from './Graph';
import Header from './Header';
import SidePanel from './SidePanel';
import { getUrl, getUrlState, sanitizeUrlState, ROUTE_PATH } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { parseUiFind, TExtractUiFindFromStateReturn } from '../common/UiFindInput';
import { getUrl as getSearchUrl } from '../SearchTracePage/url';
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
import getConfig from '../../utils/config/get-config';
import { ReduxState } from '../../types';
import { TDdgStateEntry } from '../../types/TDdgState';

import { localeStringComparator } from '../../utils/sort';

import { EMPTY_VIEW_MODIFIERS, useDdgViewModifiersStore } from './store';

import './index.css';
import { ApiError } from '../../types/api-error';
import withRouteProps from '../../utils/withRouteProps';
import { useServices, useSpanNames } from '../../hooks/useTraceDiscovery';

interface IDoneState {
  state: typeof fetchedState.DONE;
  model: TDdgModel;
}
interface IErrorState {
  state: typeof fetchedState.ERROR;
  error: ApiError;
}

type TDispatchProps = {
  fetchDeepDependencyGraph?: (query: TDdgModelParams) => void;
};

type TDdgViewModifierProps = {
  addViewModifier: (kwarg: TDdgModelParams & { viewModifier: number; visibilityIndices: number[] }) => void;
  removeViewModifierFromIndices: (
    kwarg: TDdgModelParams & { viewModifier: number; visibilityIndices: number[] }
  ) => void;
  viewModifiers: ReadonlyMap<number, number>;
};

export type TReduxProps = TExtractUiFindFromStateReturn & {
  graph: GraphModel | undefined;
  graphState?: TDdgStateEntry;
  showOp: boolean;
  urlState: TDdgSparseUrlState;
};

type THookProps = {
  services: string[];
  serverOps?: string[];
};

type TOwnProps = {
  baseUrl: string;
  extraUrlArgs?: { [key: string]: unknown };
  navigate: ReturnType<typeof useNavigate>;
  location: Location;
  showSvcOpsHeader: boolean;
};

type TExternalProps = Partial<Omit<TOwnProps, 'navigate' | 'location'>>;

type TProps = TDispatchProps & TReduxProps & TOwnProps & THookProps & TDdgViewModifierProps;

// export for tests
export function DeepDependencyGraphPageImpl({
  addViewModifier,
  baseUrl = ROUTE_PATH,
  extraUrlArgs,
  fetchDeepDependencyGraph,
  graph,
  graphState,
  navigate,
  removeViewModifierFromIndices,
  serverOps,
  services,
  showOp,
  showSvcOpsHeader = true,
  uiFind,
  urlState,
  viewModifiers,
}: TProps) {
  const [selectedVertex, setSelectedVertex] = useState<TDdgVertex | undefined>(undefined);
  const { service, operation } = urlState;

  useEffect(() => {
    if (!graphState && service && fetchDeepDependencyGraph) {
      fetchDeepDependencyGraph({ service, operation, start: 0, end: 0 });
    }
  }, [fetchDeepDependencyGraph, graphState, service, operation]);

  const graphHash = _get(graphState, 'model.hash');
  const updateUrlState = useCallback(
    (newValues: Partial<TDdgSparseUrlState>) => {
      const getUrlArg = { uiFind, ...urlState, ...newValues, ...extraUrlArgs };
      if (graphHash) getUrlArg.hash = graphHash;
      navigate(getUrl(getUrlArg, baseUrl));
    },
    [baseUrl, extraUrlArgs, graphHash, navigate, uiFind, urlState]
  );

  const clearOperation = useCallback(() => {
    trackClearOperation();
    updateUrlState({ operation: undefined });
  }, [updateUrlState]);

  const focusPathsThroughVertex = useCallback(
    (vertexKey: string) => {
      const elems = graph ? graph.getVertexVisiblePathElems(vertexKey, urlState.visEncoding) : undefined;
      if (!elems) return;

      trackFocusPaths();
      const indices = ([] as number[]).concat(
        ...elems.map(({ memberOf }) => memberOf.members.map(({ visibilityIdx }) => visibilityIdx))
      );
      updateUrlState({ visEncoding: encode(indices) });
    },
    [graph, updateUrlState, urlState.visEncoding]
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

  const getVisiblePathElems = useCallback(
    (key: string) => {
      if (graph) {
        return graph.getVertexVisiblePathElems(key, urlState.visEncoding);
      }
      return undefined;
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
    [graph, updateUrlState, urlState.visEncoding]
  );

  const setDecoration = useCallback(
    (decoration: string | undefined) => updateUrlState({ decoration }),
    [updateUrlState]
  );

  const setDensity = useCallback((density: EDdgDensity) => updateUrlState({ density }), [updateUrlState]);

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
    [graphState, updateUrlState, urlState]
  );

  const setOperation = useCallback(
    (operation: string) => {
      updateUrlState({ operation, visEncoding: undefined });
    },
    [updateUrlState]
  );

  const setService = useCallback(
    (service: string) => {
      updateUrlState({ operation: undefined, service, visEncoding: undefined });
      trackSetService();
    },
    [updateUrlState]
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
    [addViewModifier, graph, removeViewModifierFromIndices, urlState]
  );

  const selectVertex = useCallback((newSelectedVertex?: TDdgVertex) => {
    setSelectedVertex(newSelectedVertex);
  }, []);

  const showVertices = useCallback(
    (vertexKeys: string[]) => {
      const { visEncoding } = urlState;
      if (!graph) return;
      updateUrlState({ visEncoding: graph.getVisWithVertices(vertexKeys, visEncoding) });
    },
    [graph, updateUrlState, urlState]
  );

  const toggleShowOperations = useCallback(
    (enable: boolean) => updateUrlState({ showOp: enable }),
    [updateUrlState]
  );

  const updateGenerationVisibility = useCallback(
    (vertexKey: string, direction: EDirection) => {
      const { visEncoding } = urlState;
      if (!graph) return;

      const result = graph.getVisWithUpdatedGeneration(vertexKey, direction, visEncoding);
      if (!result) return;

      const { visEncoding: newVisEncoding, update } = result;
      if (update === ECheckedStatus.Empty) trackHide(direction);
      else trackShow(direction);
      updateUrlState({ visEncoding: newVisEncoding });
    },
    [graph, updateUrlState, urlState]
  );

  const { density, visEncoding } = urlState;
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
      const lookback = getConfig().search?.maxLookback?.value;
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
          operations={serverOps}
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
}

// export for tests
export function mapStateToProps(state: ReduxState, ownProps: TOwnProps): TReduxProps {
  // Services and operations are now fetched using React Query hooks (useServices/useServerSpanNames)
  // instead of Redux state. See the default export wrapper component below.
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
    showOp,
    urlState: sanitizeUrlState(urlState, _get(graphState, 'model.hash')),
    uiFind: parseUiFind(ownProps.location.search),
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch<ReduxState>): TDispatchProps {
  const { fetchDeepDependencyGraph } = bindActionCreators(jaegerApiActions, dispatch);

  return {
    fetchDeepDependencyGraph,
  };
}

const MemoizedDeepDependencyGraphPageImpl = React.memo(DeepDependencyGraphPageImpl);

const ConnectedDeepDependencyGraphPageImpl = withRouteProps(
  connect(mapStateToProps, mapDispatchToProps)(MemoizedDeepDependencyGraphPageImpl)
) as React.ComponentType<Omit<TOwnProps, 'location' | 'navigate'> & THookProps & TDdgViewModifierProps>;

// Bridges Zustand-based view modifier state into the TDdgViewModifierProps shape expected by the
// Redux-connected DeepDependencyGraphPageImpl. Also clears stale view modifiers when the graph changes.
export function useDdgViewModifierBridgeProps(): TDdgViewModifierProps {
  const location = useLocation();
  const urlState = getUrlState(location.search);
  const { service, operation } = urlState;
  const graphKey = service ? getStateEntryKey({ service, operation, start: 0, end: 0 }) : null;
  const graphState = useSelector((state: ReduxState) =>
    graphKey ? (_get(state.ddg, graphKey) as TDdgStateEntry | undefined) : undefined
  );
  const hash =
    graphState && graphState.state === fetchedState.DONE ? (graphState as IDoneState).model.hash : undefined;

  const viewModifiers = useDdgViewModifiersStore(
    useCallback(
      state => (graphKey ? (state.byKey[graphKey] ?? EMPTY_VIEW_MODIFIERS) : EMPTY_VIEW_MODIFIERS),
      [graphKey]
    )
  );

  const addViewModifier = useDdgViewModifiersStore(s => s.addViewModifier);
  const removeViewModifierFromIndices = useDdgViewModifiersStore(s => s.removeViewModifierFromIndices);

  const prevGraphRef = useRef<{ graphKey: string | null; hash: string | undefined }>({
    graphKey: null,
    hash: undefined,
  });

  useEffect(() => {
    const prev = prevGraphRef.current;

    if (graphKey === null && prev.graphKey !== null) {
      useDdgViewModifiersStore.getState().pruneViewModifiersExcept(null);
    } else if (graphKey !== null && prev.graphKey !== null && graphKey !== prev.graphKey) {
      useDdgViewModifiersStore.getState().pruneViewModifiersExcept(graphKey);
    }

    if (
      graphKey &&
      prev.graphKey === graphKey &&
      prev.hash !== undefined &&
      hash !== undefined &&
      prev.hash !== hash
    ) {
      useDdgViewModifiersStore.getState().clearViewModifiersForKey(graphKey);
    }

    prevGraphRef.current =
      graphKey !== prev.graphKey
        ? { graphKey, hash }
        : { graphKey, hash: hash === undefined ? prev.hash : hash };
  }, [graphKey, hash]);

  return { addViewModifier, removeViewModifierFromIndices, viewModifiers };
}

export default function DeepDependencyGraphPage({
  baseUrl = ROUTE_PATH,
  showSvcOpsHeader = true,
  ...restProps
}: TExternalProps) {
  const { data: services = [] } = useServices();
  const location = useLocation();
  const urlState = getUrlState(location.search);
  const { service } = urlState;
  const { data: serverOpsData = [] } = useSpanNames(service || null, 'server');
  const serverOps = useMemo(
    () => serverOpsData.map(op => op.name).sort(localeStringComparator),
    [serverOpsData]
  );

  const viewModifierProps = useDdgViewModifierBridgeProps();
  const props = { baseUrl, showSvcOpsHeader, ...restProps };

  return (
    <ConnectedDeepDependencyGraphPageImpl
      {...props}
      {...viewModifierProps}
      services={services}
      serverOps={serverOps}
    />
  );
}
