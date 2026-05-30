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
import { useDependenciesQuery, DATA_SOURCES } from '../../hooks/useDependenciesQuery';
import type { IServiceDependency, DataSource } from '../../hooks/useDependenciesQuery';

import './index.css';
import { ApiError } from '../../types/api-error';

const dagMaxNumServices = getConfig().dependencies?.dagMaxNumServices ?? FALLBACK_DAG_MAX_NUM_SERVICES;

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

export default function DependencyGraphPage() {
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource>('Backend');
  const { data, isLoading, error } = useDependenciesQuery(selectedDataSource);
  // Stabilise so the `data ?? []` fresh-array doesn't make the updateLayout
  // effect below re-fire every render when there's no data yet.
  const dependencies = useMemo(() => data ?? [], [data]);
  const { search } = useLocation();
  const uiFind = parseUiFind(search);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [selectedDepth, setSelectedDepth] = useState<number | null>(5);
  const [debouncedDepth, setDebouncedDepth] = useState<number | null>(5);

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

  const updateLayout = useCallback((dataset: IServiceDependency[]) => {
    const layout: 'dot' | 'sfdp' = dataset.length > dagMaxNumServices ? 'sfdp' : 'dot';
    if (layout !== selectedLayoutRef.current) {
      setSelectedLayout(layout);
      setSelectedService(null);
      setSelectedDepth(5);
      setDebouncedDepth(5);
    }
  }, []);

  useEffect(() => {
    updateLayout(dependencies);
  }, [dependencies, updateLayout]);

  useEffect(() => {
    return () => {
      debouncedDepthChange.cancel();
    };
  }, [debouncedDepthChange]);

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

  const handleReset = () => {
    setSelectedService(null);
    setSelectedDepth(5);
    setDebouncedDepth(5);
  };

  if (isLoading) {
    return <LoadingIndicator className="u-mt-vast" centered />;
  }
  if (error) {
    return <ErrorMessage className="ub-m3" error={error as ApiError} />;
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
          selectedDataSource={selectedDataSource}
          onDataSourceChange={setSelectedDataSource}
          dataSources={DATA_SOURCES}
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
