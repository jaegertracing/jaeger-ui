// Copyright (c) 2023 The Jaeger Authors
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

import React, { ReactNode } from 'react';

import { Digraph, LayoutManager } from '@jaegertracing/plexus';
import { TEdge, TVertex } from '@jaegertracing/plexus/lib/types';
import { TLayoutOptions } from '@jaegertracing/plexus/lib/LayoutManager/types';

import './dag.css';
import { DAG_MAX_NUM_SERVICES } from '../../constants';

type TServiceCall = {
  parent: string;
  child: string;
  callCount: number;
};

type TProps = {
  serviceCalls: TServiceCall[];
  selectedLayout: string;
  selectedDepth: number;
  selectedService: string;
};

export const renderNode = (vertex: TVertex): ReactNode => {
  return (
    <div className="DAG--node">
      <div className="DAG--nodeCircle" />
      <div className="DAG--nodeLabel" data-testid="dagNodeLabel">
        {vertex?.key ?? ''}
      </div>
    </div>
  ) as ReactNode;
};

const findConnectedServices = (
  serviceCalls: TServiceCall[],
  startService: string,
  maxDepth: number
): { nodes: Set<string>; edges: TServiceCall[] } => {
  const nodes = new Set<string>([startService]);
  const edges: TServiceCall[] = [];
  const queue: { service: string; depth: number }[] = [{ service: startService, depth: 0 }];

  while (queue.length > 0) {
    const { service, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

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
  selectedDepth: number
): {
  nodes: TVertex[];
  edges: TEdge[];
} => {
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

const { classNameIsSmall } = Digraph.propsFactories;

export default function DAG({ serviceCalls = [], selectedLayout, selectedDepth, selectedService }: TProps) {
  const data = React.useMemo(
    () => formatServiceCalls(serviceCalls, selectedService, selectedDepth),
    [serviceCalls, selectedService, selectedDepth]
  );

  const forceFocalServiceSelection = data.nodes.length > DAG_MAX_NUM_SERVICES;

  const layoutManager = React.useMemo(() => {
    const config: TLayoutOptions =
      selectedLayout === 'dot'
        ? {
            nodesep: 1.5,
            ranksep: 1.6,
            rankdir: 'TB',
            splines: 'polyline',
            useDotEdges: true,
          }
        : {
            engine: 'sfdp',
            splines: 'false',
            sfdpOptions: {
              maxiter: 1,
              overlap: false,
              dim: 2,
            },
            dpi: data.nodes.length > 100 ? Math.min(data.nodes.length * 2, 2000) : 300,
          };

    return new LayoutManager(config);
  }, [selectedLayout, data.nodes.length]);

  React.useEffect(() => {
    return () => {
      layoutManager.stopAndRelease();
    };
  }, [layoutManager]);

  if (forceFocalServiceSelection) {
    return (
      <div className="DAG">
        <div className="DAG--error">
          {`Too many services to render (${data.nodes.length}). Please select a focal service or reduce the depth.`}
        </div>
      </div>
    );
  }

  return (
    <div className="DAG">
      <Digraph<TVertex>
        key={`${selectedLayout}-${selectedService}-${selectedDepth}`}
        zoom
        minimap
        className="DAG--dag"
        setOnGraph={classNameIsSmall}
        minimapClassName="u-miniMap"
        layoutManager={layoutManager}
        measurableNodesKey="nodes"
        layers={[
          {
            key: 'edges',
            defs: [{ localId: 'arrowHead' }],
            edges: true,
            layerType: 'svg',
            markerEndId: 'arrowHead',
          },
          {
            key: 'nodes',
            layerType: 'html',
            measurable: true,
            renderNode,
          },
        ]}
        edges={data.edges}
        vertices={data.nodes}
      />
    </div>
  );
}
