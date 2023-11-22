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

import { Digraph, LayoutManager, cacheAs } from '@jaegertracing/plexus';
import { TEdge, TVertex } from '@jaegertracing/plexus/lib/types';
import { TMeasureNodeUtils } from '@jaegertracing/plexus/src/Digraph/types';

import './dag.css';

type TServiceCall = {
  parent: string;
  child: string;
  callCount: number;
};

type TProps = {
  serviceCalls: TServiceCall[];
};

const renderNode = (vertex: TVertex<TVertex>): ReactNode => {
  return (
    <div className="DAG--node">
      <div className="DAG--nodeCircle" />
      <div className="DAG--nodeLabel">{vertex.key}</div>
    </div>
  ) as ReactNode;
};

const formatServiceCalls = (
  serviceCalls: TServiceCall[]
): {
  nodes: TVertex[];
  edges: TEdge[];
} => {
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
};

export default class DAG extends React.Component<TProps> {
  static defaultProps = {
    serviceCalls: [],
  };

  private data: {
    nodes: TVertex[];
    edges: TEdge[];
  };

  private layoutManager: LayoutManager = new LayoutManager({
    nodesep: 1.5,
    ranksep: 1.6,
    rankdir: 'TB',
    splines: 'polyline',
    useDotEdges: true,
  });

  constructor(props: TProps) {
    super(props);

    this.data = formatServiceCalls(props.serviceCalls);
  }

  componentWillUnmount() {
    this.layoutManager.stopAndRelease();
  }

  render() {
    return (
      <div className="DAG">
        <Digraph<TVertex>
          zoom
          minimap
          className="DAG--dag"
          minimapClassName="DAG--miniMap"
          layoutManager={this.layoutManager}
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
              measureNode: cacheAs('html-nodes/nodes/measure', (_: TVertex, utils: TMeasureNodeUtils) => {
                const { height, width } = utils.getWrapperSize();
                return { height, width };
              }),
              renderNode,
            },
          ]}
          edges={this.data.edges}
          vertices={this.data.nodes}
        />
      </div>
    );
  }
}
