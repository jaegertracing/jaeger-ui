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

import { Digraph, LayoutManager } from '@jaegertracing/plexus';
import { TEdge, TVertex } from '@jaegertracing/plexus/lib/types';

import './dag-new.css';

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

export default class DAGDiagraph extends React.Component<TProps> {
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
          edgeLabel: `${d.callCount}`,
        });
      }
    });

    this.setState(prevState => ({
      ...prevState,
      edges,
      nodes,
    }));
  }

  componentWillUnmount() {
    this.layoutManager.stopAndRelease();
  }

  render() {
    // console.log(this.state.nodes);
    // console.log(this.state.edges);

    return (
      <>
        <p>{this.state.nodes.length}</p>
        <Digraph
          zoom
          minimap
          minimapClassName="u-miniMap"
          layoutManager={this.layoutManager}
          measurableNodesKey="nodes"
          setOnGraph={{
            style: {
              fontFamily: 'sans-serif',
              height: '100%',
              position: 'fixed',
              width: '100%',
            },
          }}
          edges={this.state.edges}
          vertices={this.state.nodes}
          // vertices={this.state.nodes.map(n => ({
          //   key: n.key,
          //   service: n.key,
          //   isFocalNode: false,
          //   operation: null,
          // }))}
          layers={[
            {
              key: 'edges',
              edges: true,
              layerType: 'svg',
              defs: [{ localId: 'edge-arrow' }],
              markerEndId: 'edge-arrow',
            },
            // {
            //   key: 'nodes',
            //   layerType: 'html',
            //   measurable: true,
            //   renderNode: (vertex: TVertex) => {
            //     return vertex.key;
            //   },
            //   setOnNode: { style: { padding: '1rem', whiteSpace: 'nowrap', background: '#e8e8e8' } },
            // },
          ]}
        />
      </>
    );
  }
}
