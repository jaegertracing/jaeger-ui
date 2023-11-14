// Copyright (c) 2017 Uber Technologies, Inc.
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

import React from 'react';

import { LayoutManager, DirectedGraph } from '@jaegertracing/plexus';
import { TEdge, TVertex } from '@jaegertracing/plexus/lib/types';

export function getNodeLabel(vertex: { key: string; label?: string }) {
  let { label } = vertex;
  label = !label ? String(vertex.key) : label;

  if (typeof label !== 'string' && !React.isValidElement(label)) {
    label = String(label);
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: '#10939B',
          borderRadius: '50%',
          height: '3rem',
          width: '3rem',
        }}
      />

      <div
        style={{
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.25rem',
          color: '#7F7F7F',
        }}
      >
        {label}
      </div>
    </div>
  );
}

type TProps = {
  serviceCalls: {
    parent: string;
    child: string;
    callCount: number;
  }[];
};

type TState = {
  nodes: TVertex[];
  edges: TEdge[];
};

export default class DAGDirectedGraph extends React.Component<TProps> {
  static defaultProps = {
    serviceCalls: [],
  };

  state: TState;

  private layoutManager: LayoutManager = new LayoutManager({
    nodesep: 1.5,
    ranksep: 1.5,
    rankdir: 'TB',
    splines: 'polyline',
    useDotEdges: true,
  });

  constructor(props: TProps) {
    super(props);

    this.state = {
      nodes: [],
      edges: [],
    };
  }

  componentDidMount() {
    const { serviceCalls } = this.props;

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

    this.setState(prevState => ({
      ...prevState,
      nodes,
      edges,
    }));
  }

  componentWillUnmount() {
    this.layoutManager.stopAndRelease();
  }

  render() {
    return (
      <DirectedGraph
        zoom
        minimap
        minimapClassName="u-miniMap"
        layoutManager={this.layoutManager}
        edges={this.state.edges}
        vertices={this.state.nodes}
        getNodeLabel={getNodeLabel}
      />
    );
  }
}
