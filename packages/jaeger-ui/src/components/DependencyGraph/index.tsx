// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import memoizeOne from 'memoize-one';
import debounce from 'lodash/debounce';
import { useLocation } from 'react-router-dom';
import { TEdge, TVertex } from '@jaegertracing/plexus/lib/types';

import DAG from './DAG';
import DAGOptions from './DAGOptions';
import ErrorMessage from '../common/ErrorMessage';
import LoadingIndicator from '../common/LoadingIndicator';
import { FALLBACK_DAG_MAX_NUM_SERVICES } from '../../constants';
import getConfig from '../../utils/config/get-config';
import { parseUiFind } from '../common/UiFindInput';
import { useDependenciesQuery } from '../../hooks/useDependenciesQuery';
import type { IServiceDependency } from '../../hooks/useDependenciesQuery';

import './index.css';
import { getAppEnvironment } from '../../utils/constants';
import { ApiError } from '../../types/api-error';

const sampleDatasetTypes = ['Backend', 'Small Graph', 'Large Graph'];

const dagMaxNumServices = getConfig().dependencies?.dagMaxNumServices ?? FALLBACK_DAG_MAX_NUM_SERVICES;

export type TProps = {
  dependencies: IServiceDependency[];
  loading: boolean;
  error: ApiError | null | undefined;
  onSampleDataLoaded?: () => void;
  refetchDependencies?: () => void;
};

const createSampleDataManager = () => {
  let sampleDAGDataset: IServiceDependency[] = [];
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
      sampleDAGDataset = (module as { default: IServiceDependency[] }).default ?? [];
      return sampleDAGDataset;
    },
  };
};

const findConnectedServices = (
  serviceCalls: IServiceDependency[],
  startService: string,
  maxDepth: number | null | undefined
) => {
  const nodes = new Set([startService]);
  const edges: IServiceDependency[] = [];
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
  serviceCalls: IServiceDependency[],
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
export { loadSampleData };

function useEffectiveDependencies(apiDependencies: IServiceDependency[] | undefined, sampleRevision: number) {
  return useMemo(() => {
    // sampleRevision bumps when loadSampleData completes (module-level sample store)
    void sampleRevision;
    const sample = getSampleData();
    return sample.length > 0 ? sample : (apiDependencies ?? []);
  }, [apiDependencies, sampleRevision]);
}

// export for tests
export function DependencyGraphPageImpl(props: TProps) {
  const { dependencies, error, loading, onSampleDataLoaded, refetchDependencies } = props;
  const { search } = useLocation();
  const uiFind = parseUiFind(search);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [selectedDepth, setSelectedDepth] = useState<number | null>(5);
  const [debouncedDepth, setDebouncedDepth] = useState<number | null>(5);
  const [selectedSampleDatasetType, setSelectedSampleDatasetType] = useState<string>('Backend');

  const getMemoizedGraphData = useMemo(
    () =>
      memoizeOne((deps: IServiceDependency[], svc: string | null, depth: number | null) =>
        formatServiceCalls(deps ?? [], svc, depth)
      ),
    []
  );

  const getMemoizedMatchCount = useMemo(
    () =>
      memoizeOne((graphDataNodes: TVertex[], uiFindStr: string | undefined) => {
        if (!uiFindStr) return 0;
        return graphDataNodes.filter((node: TVertex) =>
          node.key.toLowerCase().includes(uiFindStr.toLowerCase())
        ).length;
      }),
    []
  );

  const debouncedDepthChange = useMemo(
    () => debounce((value: number | null) => setDebouncedDepth(value), 1000),
    []
  );

  const selectedLayoutRef = useRef(selectedLayout);
  selectedLayoutRef.current = selectedLayout;

  const dependenciesRef = useRef(dependencies);
  const updateLayout = useCallback(() => {
    const dataset: IServiceDependency[] =
      getSampleData().length > 0 ? getSampleData() : dependenciesRef.current;
    const layout: 'dot' | 'sfdp' = dataset.length > dagMaxNumServices ? 'sfdp' : 'dot';
    if (layout !== selectedLayoutRef.current) {
      setSelectedLayout(layout);
      setSelectedService(null);
      setSelectedDepth(5);
      setDebouncedDepth(5);
    }
  }, []);

  useEffect(() => {
    updateLayout();
  }, [updateLayout]);

  useEffect(() => {
    return () => {
      debouncedDepthChange.cancel();
    };
  }, [debouncedDepthChange]);

  useEffect(() => {
    if (dependenciesRef.current !== dependencies) {
      dependenciesRef.current = dependencies;
      updateLayout();
    }
  }, [dependencies, updateLayout]);

  const handleServiceSelect = (service: string | null) => setSelectedService(service);
  const handleLayoutSelect = (layout: string) => setSelectedLayout(layout);
  const handleDepthChange = (value: number | null | undefined) => {
    const normalizedValue = value === undefined ? null : value;
    if (normalizedValue === null) {
      setSelectedDepth(normalizedValue);
      setDebouncedDepth(normalizedValue);
    } else if (Number.isInteger(normalizedValue) && normalizedValue >= 0) {
      setSelectedDepth(normalizedValue);
      debouncedDepthChange(normalizedValue);
    } else {
      setSelectedDepth(0);
      setDebouncedDepth(0);
    }
  };

  const handleSampleDatasetTypeChange = (type: string) => {
    setSelectedSampleDatasetType(type);
    loadSampleData(type).then(() => {
      onSampleDataLoaded?.();
      refetchDependencies?.();
    });
  };

  const handleReset = () => {
    setSelectedService(null);
    setSelectedDepth(5);
    setDebouncedDepth(5);
  };

  if (loading) {
    return <LoadingIndicator className="u-mt-vast" centered />;
  }
  if (error) {
    return <ErrorMessage className="ub-m3" error={error} />;
  }

  if (dependencies.length === 0) {
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

export default function DependencyGraphPage() {
  const { data, isLoading, error, refetch } = useDependenciesQuery();
  const [sampleRevision, setSampleRevision] = useState(0);
  const dependencies = useEffectiveDependencies(data, sampleRevision);
  const usingSampleData = getSampleData().length > 0;

  return (
    <DependencyGraphPageImpl
      dependencies={dependencies}
      loading={usingSampleData ? false : isLoading}
      error={usingSampleData ? null : (error as ApiError | null)}
      onSampleDataLoaded={() => setSampleRevision(r => r + 1)}
      refetchDependencies={() => {
        refetch();
      }}
    />
  );
}
