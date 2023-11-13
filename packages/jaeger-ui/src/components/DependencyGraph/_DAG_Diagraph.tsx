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

import { Digraph, LayoutManager, cacheAs } from '@jaegertracing/plexus';
import { TEdge, TVertex, TLayoutVertex } from '@jaegertracing/plexus/lib/types';
import { TLargeNode } from '@jaegertracing/plexus/demo/src/data-large';
import { TRendererUtils, TMeasureNodeUtils } from '@jaegertracing/plexus/src/Digraph/types';
import largeDag from '@jaegertracing/plexus/demo/src/data-large';

import './dag-new.css';

const { classNameIsSmall: layeredClassNameIsSmall, scaleStrokeOpacity } = Digraph.propsFactories;

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

const testData = {
  edges: [
    {
      from: 'frontend',
      to: 'driver',
      edgeLabel: '9',
    },
    {
      from: 'customer',
      to: 'mysql',
      edgeLabel: '9',
    },
    {
      from: 'frontend',
      to: 'route',
      edgeLabel: '90',
    },
    {
      from: 'frontend',
      to: 'customer',
      edgeLabel: '9',
    },
    {
      from: 'driver',
      to: 'redis-manual',
      edgeLabel: '122',
    },
  ],
  nodes: [
    {
      key: 'frontend',
    },
    {
      key: 'customer',
    },
    {
      key: 'driver',
    },
    {
      key: 'redis-manual',
    },
    {
      key: 'mysql',
    },
    {
      key: 'route',
    },
  ],
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

    // console.log(this.state);
    // console.log(largeDag);

    return (
      <div className="DemoGraph">
        <Digraph<TLargeNode>
          zoom
          minimap
          className="DemoGraph--dag"
          layoutManager={new LayoutManager({ useDotEdges: true, rankdir: 'TB' })}
          minimapClassName="Demo--miniMap"
          setOnGraph={layeredClassNameIsSmall}
          measurableNodesKey="nodes"
          layers={[
            {
              key: 'edges',
              defs: [{ localId: 'arrowHead' }],
              edges: true,
              layerType: 'svg',
              markerEndId: 'arrowHead',
              setOnContainer: cacheAs('svg-nodes/edges/set-on-container', [
                { className: 'DdgGraph--edges' },
                scaleStrokeOpacity,
              ]),
            },
            {
              key: 'nodes',
              layerType: 'svg',
              measurable: true,
              measureNode: cacheAs('svg-nodes/nodes/measure', (_: TVertex, utils: TMeasureNodeUtils) => {
                const { height, width } = utils.getWrapperSize();
                return { height: height + 40, width: width + 40 };
              }),
              renderNode: cacheAs(
                'svg-nodes/nodes/render',
                // eslint-disable-next-line react/no-unstable-nested-components
                (
                  vertex: TVertex<TLargeNode>,
                  utils: TRendererUtils,
                  lv: TLayoutVertex<TLargeNode> | null
                ) => (
                  <>
                    {lv && (
                      <rect
                        width={lv.width}
                        height={lv.height}
                        fill="#ddd"
                        stroke="#444"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    <text x="20" y="20" dy="1em">
                      {vertex.key}
                    </text>
                  </>
                )
              ),
            },
          ]}
          // edges={this.state.edges}
          // vertices={this.state.nodes.map(n => ({
          //   key: n.key,
          //   service: n.key,
          //   operation: n.key,
          // }))}

          // edges={largeDag.edges}
          // vertices={largeDag.vertices}

          edges={testData.edges}
          vertices={testData.nodes.map(n => ({
            key: n.key,
            service: n.key,
            operation: n.key,
          }))}
        />
      </div>
    );

    // return (
    //   <Digraph
    //     zoom
    //     minimap
    //     minimapClassName="u-miniMap"
    //     layoutManager={this.layoutManager}
    //     measurableNodesKey="nodes"
    //     setOnGraph={{
    //       style: {
    //         fontFamily: 'sans-serif',
    //         height: '100%',
    //         position: 'fixed',
    //         width: '100%',
    //       },
    //     }}
    //     edges={this.state.edges}
    //     vertices={this.state.nodes}
    //     // vertices={this.state.nodes.map(n => ({
    //     //   key: n.key,
    //     //   service: n.key,
    //     //   isFocalNode: false,
    //     //   operation: null,
    //     // }))}
    //     layers={[
    //       {
    //         key: 'edges',
    //         edges: true,
    //         layerType: 'svg',
    //         defs: [{ localId: 'edge-arrow' }],
    //         markerEndId: 'edge-arrow',
    //       },
    //       // {
    //       //   key: 'nodes',
    //       //   layerType: 'html',
    //       //   measurable: true,
    //       //   renderNode: (vertex: TVertex) => {
    //       //     return vertex.key;
    //       //   },
    //       //   setOnNode: { style: { padding: '1rem', whiteSpace: 'nowrap', background: '#e8e8e8' } },
    //       // },
    //     ]}
    //   />
    // );
  }
}
