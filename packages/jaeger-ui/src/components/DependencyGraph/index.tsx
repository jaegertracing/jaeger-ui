// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import memoizeOne from 'memoize-one';
import debounce from 'lodash/debounce';
import { TEdge, TVertex } from '@jaegertracing/plexus/lib/types';

import DAG from './DAG';
import DAGOptions from './DAGOptions';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import * as jaegerApiActions from '../../actions/jaeger-api';
import { FALLBACK_DAG_MAX_NUM_SERVICES } from '../../constants';
import { getConfigValue } from '../../utils/config/get-config';
import { extractUiFindFromState } from '../common/UiFindInput';

import './index.css';
import withRouteProps from '../../utils/withRouteProps';
import { getAppEnvironment } from '../../utils/constants';
import { ApiError } from '../../types/api-error';
import { ReduxState } from '../../types';

/* ---------------- constants ---------------- */

export const GRAPH_TYPES = {
  DAG: { type: 'DAG', name: 'DAG' },
};
export const sampleDatasetTypes = ['Backend', 'Small Graph', 'Large Graph'];

const dagMaxNumServices = getConfigValue('dependencies.dagMaxNumServices') || FALLBACK_DAG_MAX_NUM_SERVICES;

/* ---------------- types ---------------- */

type TServiceCall = {
  parent: string;
  child: string;
  callCount: number;
};

type TProps = {
  dependencies: TServiceCall[];
  fetchDependencies: () => void;
  nodes: TVertex[] | null;
  links: TEdge[] | null;
  loading: boolean;
  error: ApiError | null | undefined;
  uiFind?: string;
};

type TState = {
  selectedService: string | null;
  selectedLayout: string | null;
  selectedDepth: number | null;
  debouncedDepth: number | null;
  selectedSampleDatasetType: string;
};

/* ---------------- helpers (UNCHANGED) ---------------- */

const createSampleDataManager = () => {
  let sampleDAGDataset: TServiceCall[] = [];
  return {
    getSampleData: () => sampleDAGDataset,
    loadSampleData: async (type: string) => {
      let module = {};
      const isDev = getAppEnvironment() === 'development';
      if (isDev && type === 'Small Graph') {
        module = await import('./sample_data/small.json');
      } else if (isDev && type === 'Large Graph') {
        module = await import('./sample_data/large.json');
      }
      sampleDAGDataset = (module as { default: TServiceCall[] }).default ?? [];
      return sampleDAGDataset;
    },
  };
};

const findConnectedServices = (
  serviceCalls: TServiceCall[],
  startService: string,
  maxDepth: number | null | undefined
) => {
  const nodes = new Set([startService]);
  const edges: TServiceCall[] = [];
  const queue = [{ service: startService, depth: 0 }];

  const maxDepthValue = maxDepth ?? Number.MAX_SAFE_INTEGER;

  while (queue.length > 0) {
    const { service, depth } = queue.shift()!;
    if (depth >= maxDepthValue) continue;

    serviceCalls.forEach(call => {
      if (call.parent === service && !nodes.has(call.child)) {
        nodes.add(call.child);
        edges.push(call);
        queue.push({ service: call.child, depth: depth + 1 });
      }
      if (call.child === service && !nodes.has(call.parent)) {
        nodes.add(call.parent);
        edges.push(call);
        queue.push({ service: call.parent, depth: depth + 1 });
      }
    });
  }

  return { nodes, edges };
};

const formatServiceCalls = (
  serviceCalls: TServiceCall[],
  selectedService: string | null,
  selectedDepth: number | null | undefined
): { nodes: TVertex[]; edges: TEdge[] } => {
  if (!selectedService) {
    const nodeMap: Record<string, boolean> = {};
    const nodes: TVertex[] = [];
    const edges: TEdge[] = [];

    serviceCalls.forEach(d => {
      if (d.parent.trim().length !== 0 && d.child.trim().length !== 0) {
        if (!nodeMap[d.parent]) {
          nodes.push({ key: d.parent });
          nodeMap[d.parent] = true;
        }

        if (!nodeMap[d.child]) {
          nodes.push({ key: d.child });
          nodeMap[d.child] = true;
        }

        edges.push({
          from: d.parent,
          to: d.child,
          label: `${d.callCount}`,
        });
      }
    });

    return { nodes, edges };
  }

  const { nodes: connectedNodes, edges: connectedEdges } = findConnectedServices(
    serviceCalls,
    selectedService,
    selectedDepth
  );

  return {
    nodes: Array.from(connectedNodes).map(key => ({ key })),
    edges: connectedEdges.map(edge => ({
      from: edge.parent,
      to: edge.child,
      label: `${edge.callCount}`,
    })),
  };
};

const { getSampleData, loadSampleData } = createSampleDataManager();

/* ---------------- FUNCTIONAL COMPONENT ---------------- */

export function DependencyGraphPageImpl(props: TProps) {
  const { nodes, links, error, loading, dependencies, uiFind, fetchDependencies } = props;

  const [state, setState] = useState<TState>({
    selectedService: null,
    selectedLayout: null,
    selectedDepth: 5,
    debouncedDepth: 5,
    selectedSampleDatasetType: 'Backend',
  });

  const { selectedService, selectedLayout, selectedDepth, debouncedDepth, selectedSampleDatasetType } = state;

  const debouncedDepthChange = useRef(
    debounce((value: number | null) => {
      setState(prev => ({ ...prev, debouncedDepth: value }));
    }, 1000)
  ).current;

  const getMemoizedGraphData = useRef(
    memoizeOne((dependencies: TServiceCall[], selectedService: string | null, selectedDepth: number | null) =>
      formatServiceCalls(dependencies ?? [], selectedService, selectedDepth)
    )
  ).current;

  const getMemoizedMatchCount = useRef(
    memoizeOne((graphDataNodes: TVertex[], uiFind: string | undefined) => {
      if (!uiFind) return 0;
      return graphDataNodes.filter(node => node.key.toLowerCase().includes(uiFind.toLowerCase())).length;
    })
  ).current;

  const updateLayout = () => {
    const dataset: TServiceCall[] = getSampleData().length > 0 ? getSampleData() : dependencies;
    const layout: 'dot' | 'sfdp' = dataset.length > dagMaxNumServices ? 'sfdp' : 'dot';

    setState(prev => {
      if (layout !== prev.selectedLayout) {
        return {
          ...prev,
          selectedLayout: layout,
          selectedService: null,
          selectedDepth: 5,
          debouncedDepth: 5,
        };
      }
      return prev;
    });
  };

  useEffect(() => {
    fetchDependencies();
    updateLayout();
  }, []);

  useEffect(() => {
    updateLayout();
  }, [dependencies]);

  /* ---------- handlers ---------- */

  const handleServiceSelect = (service: string | null) => {
    setState(prev => ({ ...prev, selectedService: service }));
  };

  const handleLayoutSelect = (layout: string) => {
    setState(prev => ({ ...prev, selectedLayout: layout }));
  };

  const handleDepthChange = (value: number | null) => {
    if (value === null || value === undefined) {
      setState(prev => ({ ...prev, selectedDepth: value, debouncedDepth: value }));
    } else if (Number.isInteger(value) && value >= 0) {
      setState(prev => ({ ...prev, selectedDepth: value }));
      debouncedDepthChange(value);
    } else {
      setState(prev => ({ ...prev, selectedDepth: 0, debouncedDepth: 0 }));
    }
  };

  const handleSampleDatasetTypeChange = (selectedSampleDatasetType: string) => {
    setState(prev => ({ ...prev, selectedSampleDatasetType }));
    loadSampleData(selectedSampleDatasetType).then(() => {
      fetchDependencies();
    });
  };

  const handleReset = () => {
    setState(prev => ({
      ...prev,
      selectedService: null,
      selectedDepth: 5,
      debouncedDepth: 5,
    }));
  };

  /* ---------- render ---------- */

  if (loading) return <LoadingIndicator className="u-mt-vast" centered />;
  if (error) return <ErrorMessage className="ub-m3" error={error} />;

  if (!nodes || !links) {
    return (
      <div className="u-simple-card ub-m3">
        No service dependencies found.{' '}
        <a
          href="https://www.jaegertracing.io/docs/latest/faq/#why-is-the-dependencies-page-empty"
          rel="noopener noreferrer"
          target="_blank"
        >
          See FAQ
        </a>
        .
      </div>
    );
  }

  const isHierarchicalDisabled = dependencies.length > dagMaxNumServices;
  const graphData = getMemoizedGraphData(dependencies, selectedService, debouncedDepth);
  const matchCount = getMemoizedMatchCount(graphData.nodes, uiFind);

  return (
    <div>
      <div className="ub-m3">
        <DAGOptions
          dependencies={dependencies}
          onServiceSelect={handleServiceSelect}
          onLayoutSelect={handleLayoutSelect}
          onDepthChange={handleDepthChange}
          selectedService={selectedService ?? undefined}
          selectedLayout={selectedLayout ?? undefined}
          selectedDepth={selectedDepth ?? undefined}
          onReset={handleReset}
          isHierarchicalDisabled={isHierarchicalDisabled}
          selectedSampleDatasetType={selectedSampleDatasetType}
          onSampleDatasetTypeChange={handleSampleDatasetTypeChange}
          sampleDatasetTypes={sampleDatasetTypes}
          uiFind={uiFind}
          matchCount={matchCount}
        />
      </div>
      <div className="DependencyGraph--graphWrapper">
        <DAG
          data={graphData}
          selectedLayout={selectedLayout ?? 'dot'}
          selectedDepth={debouncedDepth ?? 0}
          selectedService={selectedService ?? ''}
          uiFind={uiFind}
          onServiceSelect={handleServiceSelect}
        />
      </div>
    </div>
  );
}

/* ---------------- redux unchanged ---------------- */

type TFormattedLink = {
  source: string;
  target: string;
  callCount: number;
  value: number;
  target_node_size: number;
};

const formatDependenciesAsNodesAndLinks = memoizeOne(dependencies => {
  const data = dependencies.reduce(
    (response: { nodeMap: Record<string, number>; links: TFormattedLink[] }, link: TServiceCall) => {
      const { nodeMap } = response;
      let { links } = response;

      nodeMap[link.parent] = nodeMap[link.parent] ? nodeMap[link.parent] + link.callCount : link.callCount;
      nodeMap[link.child] = nodeMap[link.child]
        ? response.nodeMap[link.child] + link.callCount
        : link.callCount;

      if (link.parent !== link.child) {
        links = links.concat([
          {
            source: link.parent,
            target: link.child,
            callCount: link.callCount,
            value: Math.max(Math.sqrt(link.callCount / 10000), 1),
            target_node_size: Math.max(Math.log(nodeMap[link.child] / 1000), 3),
          },
        ]);
      }

      return { nodeMap, links };
    },
    { nodeMap: {}, links: [] as TFormattedLink[] }
  );

  data.nodes = Object.keys(data.nodeMap).map(id => ({
    callCount: data.nodeMap[id],
    radius: Math.max(Math.log(data.nodeMap[id] / 1000), 3),
    orphan: data.links.findIndex((link: TFormattedLink) => id === link.source || id === link.target) === -1,
    id,
  }));

  return { nodes: data.nodes, links: data.links };
});

// export for tests
export function mapStateToProps(state: ReduxState): Omit<TProps, 'fetchDependencies'> {
  const { dependencies, error, loading } = state.dependencies;
  let links: TEdge[] | null = null;
  let nodes: TVertex[] | null = null;

  if (dependencies && dependencies.length > 0) {
    const formatted = formatDependenciesAsNodesAndLinks(dependencies);
    links = formatted.links;
    nodes = formatted.nodes;
  }

  const dataset: TServiceCall[] = getSampleData().length > 0 ? getSampleData() : dependencies;

  return {
    loading,
    error,
    nodes,
    links,
    dependencies: dataset,
    ...extractUiFindFromState(state),
  };
}

// export for tests
export function mapDispatchToProps(dispatch: Dispatch): Pick<TProps, 'fetchDependencies'> {
  const { fetchDependencies } = bindActionCreators(jaegerApiActions, dispatch);
  return { fetchDependencies };
}

export default withRouteProps(connect(mapStateToProps, mapDispatchToProps)(DependencyGraphPageImpl));
