// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Location } from 'react-router-dom';

import { trackClearOperation, trackFocusPaths, trackHide, trackSetService, trackShow } from './index.track';
import Graph from './Graph';
import Header from './Header';
import SidePanel from './SidePanel';
import { getUrl, getUrlState, sanitizeUrlState, ROUTE_PATH } from './url';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { parseUiFind, TExtractUiFindFromStateReturn } from '../common/UiFindInput';
import { getUrl as getSearchUrl } from '../SearchTracePage/url';
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
import { TDdgStateEntry } from '../../types/TDdgState';
import { graphStateFromDdgQuery } from '../../hooks/ddgGraphState';
import { useDeepDependencyGraphQueryFromUrl } from '../../hooks/useDeepDependencyGraphQuery';

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

type TProps = TReduxProps & TOwnProps & THookProps & TDdgViewModifierProps;

type TState = {
  selectedVertex?: TDdgVertex;
};

// export for tests
export class DeepDependencyGraphPageImpl extends React.PureComponent<TProps, TState> {
  static defaultProps = {
    showSvcOpsHeader: true,
    baseUrl: ROUTE_PATH,
  };

  state: TState = {};

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
      const { model: ddgModel } = graphState as IDoneState;

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
    const { baseUrl, extraUrlArgs, graphState, navigate, uiFind, urlState } = this.props;
    const getUrlArg = { uiFind, ...urlState, ...newValues, ...extraUrlArgs };
    const hash =
      graphState && graphState.state === fetchedState.DONE
        ? (graphState as IDoneState).model.hash
        : undefined;
    if (hash) getUrlArg.hash = hash;
    navigate(getUrl(getUrlArg, baseUrl));
  };

  render() {
    const { selectedVertex } = this.state;
    const {
      baseUrl,
      extraUrlArgs,
      graph,
      graphState,
      serverOps,
      services,
      showOp,
      uiFind,
      urlState,
      showSvcOpsHeader,
    } = this.props;
    const { density, operation, service, visEncoding } = urlState;
    const distanceToPathElems =
      graphState && graphState.state === fetchedState.DONE
        ? (graphState as IDoneState).model.distanceToPathElems
        : undefined;
    const uiFindMatches = graph && graph.getVisibleUiFindMatches(uiFind, visEncoding);
    const hiddenUiFindMatches = graph && graph.getHiddenUiFindMatches(uiFind, visEncoding);

    let content: React.ReactElement | null;
    let wrapperClassName = '';
    if (!graphState) {
      content = <h1>Enter query above</h1>;
    } else if (graphState.state === fetchedState.DONE && graph) {
      const { edges, vertices } = graph.getVisible(visEncoding);
      const { viewModifiers } = this.props;
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
            clearOperation={this.clearOperation}
            density={density}
            distanceToPathElems={distanceToPathElems}
            hiddenUiFindMatches={hiddenUiFindMatches}
            operation={operation}
            operations={serverOps}
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
export function deriveDdgPageProps(
  locationSearch: string,
  graphState: TDdgStateEntry | undefined
): TReduxProps {
  const urlState = getUrlState(locationSearch);
  const { density, operation, service, showOp: urlStateShowOp } = urlState;
  const showOp = urlStateShowOp !== undefined ? urlStateShowOp : operation !== undefined;
  const effectiveGraphState = service ? graphState : undefined;
  let graph: GraphModel | undefined;
  if (effectiveGraphState && effectiveGraphState.state === fetchedState.DONE) {
    graph = makeGraph((effectiveGraphState as IDoneState).model, showOp, density);
  }
  return {
    graph,
    graphState: effectiveGraphState,
    showOp,
    urlState: sanitizeUrlState(
      urlState,
      effectiveGraphState && effectiveGraphState.state === fetchedState.DONE
        ? (effectiveGraphState as IDoneState).model.hash
        : undefined
    ),
    uiFind: parseUiFind(locationSearch),
  };
}

export type TDdgViewModifierBridgeOptions = {
  modelHash?: string;
};

// Bridges Zustand-based view modifier state into the TDdgViewModifierProps shape expected by the
// page implementation. Also clears stale view modifiers when the graph changes.
export function useDdgViewModifierBridgeProps(
  options?: TDdgViewModifierBridgeOptions
): TDdgViewModifierProps {
  const location = useLocation();
  const urlState = getUrlState(location.search);
  const { service, operation } = urlState;
  const graphKey = service ? getStateEntryKey({ service, operation, start: 0, end: 0 }) : null;
  const hash = options?.modelHash;

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

type TConnectedPageProps = TOwnProps & THookProps & TExternalProps;
type TConnectedPageExternalProps = THookProps & TExternalProps;

const DeepDependencyGraphPageConnected = withRouteProps(function DeepDependencyGraphPageConnected(
  props: TConnectedPageProps
) {
  const {
    baseUrl = ROUTE_PATH,
    showSvcOpsHeader = true,
    location,
    navigate,
    services,
    serverOps,
    extraUrlArgs,
  } = props;
  const urlState = getUrlState(location.search);
  const { service, operation } = urlState;
  const ddgQuery = useDeepDependencyGraphQueryFromUrl(service, operation);
  const graphState = graphStateFromDdgQuery(ddgQuery);
  const modelHash =
    graphState && graphState.state === fetchedState.DONE ? (graphState as IDoneState).model.hash : undefined;
  const pageProps = deriveDdgPageProps(location.search, graphState);
  const viewModifierProps = useDdgViewModifierBridgeProps({ modelHash });

  return (
    <DeepDependencyGraphPageImpl
      baseUrl={baseUrl}
      showSvcOpsHeader={showSvcOpsHeader}
      location={location}
      navigate={navigate}
      extraUrlArgs={extraUrlArgs}
      services={services}
      serverOps={serverOps}
      {...pageProps}
      {...viewModifierProps}
    />
  );
}) as React.ComponentType<TConnectedPageExternalProps>;

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

  return (
    <DeepDependencyGraphPageConnected
      {...restProps}
      baseUrl={baseUrl}
      showSvcOpsHeader={showSvcOpsHeader}
      services={services}
      serverOps={serverOps}
    />
  );
}
