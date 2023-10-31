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

import memoize from 'memoize-one';

import { Digraph, LayoutManager, cacheAs } from '@jaegertracing/plexus';
// import { TSetProps, TFromGraphStateFn, TDefEntry } from '@jaegertracing/plexus/lib/Digraph/types';
// import { TEdge } from '@jaegertracing/plexus/lib/types';
// import TNonEmptyArray from '@jaegertracing/plexus/lib/types/TNonEmptyArray';

import { TLayoutEdge, TLayoutVertex, TVertex } from '@jaegertracing/plexus/lib/types';
import { getNodeRenderer, measureNode } from '../DeepDependencies/Graph/DdgNodeContent';
import getNodeRenderers from '../DeepDependencies/Graph/getNodeRenderers';
import getSetOnEdge from '../DeepDependencies/Graph/getSetOnEdge';

function getColorNodeLabel(vertex: { key: string; label?: string }) {
  let { label } = vertex;
  label = !label ? String(vertex.key) : label;

  if (typeof label !== 'string' && !React.isValidElement(label)) {
    label = String(label);
  }

  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      <div
        style={{
          backgroundColor: 'cyan',
          borderRadius: '50%',
          height: '3rem',
          width: '3rem',
        }}
      />

      <div style={{ margin: '0 auto', width: '100%', textAlign: 'center' }}>{label}</div>
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

type TNode = {
  data: {
    id: string;
  };
};

type TEdge = {
  data: {
    source: string;
    target: string;
    label: string;
  };
};

type TState = {
  nodes: TNode[];
  edges: TEdge[];
};

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

function renderVowelEmphasisHtml(lv: TLayoutVertex<any>) {
  return VOWELS.has(lv.vertex.key[0]) ? <div className="DemoGraph--node--emphasized" /> : null;
}

const { classNameIsSmall: layeredClassNameIsSmall, scaleStrokeOpacity } = Digraph.propsFactories;

function getNodeLabel(vertex: TVertex<{ key: string }>) {
  const [svc, op] = vertex.key.split('::', 2);
  return (
    <span className="DemoGraph--nodeLabel">
      <strong>{svc}</strong>
      <br />
      {op}
    </span>
  );
}

const setOnNode = (vertex: TVertex) => ({
  className: 'DemoGraph--node',
  // eslint-disable-next-line no-console
  onClick: () => console.log(vertex.key),
});

export default class DAGDiagraph extends React.Component<TProps> {
  static defaultProps = {
    serviceCalls: [],
  };

  state: TState;

  private getNodeRenderers = memoize(getNodeRenderers);
  private getNodeContentRenderer = memoize(getNodeRenderer);
  private getSetOnEdge = memoize(getSetOnEdge);

  private layoutManager: LayoutManager = new LayoutManager({
    nodesep: 0.55,
    ranksep: 1.5,
    rankdir: 'TB',
    // shape: 'circle',
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

    const nodes: TNode[] = [];
    const edges: TEdge[] = [];

    serviceCalls.forEach(d => {
      if (d.parent.trim().length !== 0 && d.child.trim().length !== 0) {
        if (!nodeMap[d.parent]) {
          nodes.push({ data: { id: d.parent } });
          nodeMap[d.parent] = true;
        }

        if (!nodeMap[d.child]) {
          nodes.push({ data: { id: d.child } });
          nodeMap[d.child] = true;
        }

        edges.push({
          data: { source: d.parent, target: d.child, label: `${d.callCount}` },
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

  private setUxOnEdge = (layoutEdge: TLayoutEdge<any>) => ({
    onMouseOver: () => this.onEdgeEnter(layoutEdge),
    onMouseOut: () => this.onEdgeExit(layoutEdge),
  });

  private onEdgeEnter = (le: TLayoutEdge<any>) => {
    // this.hovering = le;
    // this.setState(this.updateHoveredState);
  };

  private onEdgeExit = (le: TLayoutEdge<any>) => {
    // if (this.hovering === le) {
    //   this.hovering = null;
    // }
    // this.setState(this.updateHoveredState);
  };

  render() {
    const nodeRenderers = this.getNodeRenderers(new Set(), new Map());
    return (
      <Digraph
        zoom
        minimap
        minimapClassName="u-miniMap"
        // layoutManager={this.layoutManager}
        layoutManager={new LayoutManager({ useDotEdges: true })}
        edges={this.state.edges.map(edge => ({ from: edge.data.source, to: edge.data.target }))}
        vertices={this.state.nodes.map(node => ({
          key: node.data.id,
          service: node.data.id,
          operation: node.data.id,
        }))}
        measurableNodesKey="nodes/content"
        // getNodeLabel={getColorNodeLabel}
        layers={[
          {
            key: 'nodes-layers',
            layerType: 'html',
            layers: [
              {
                key: 'emph-nodes',
                renderNode: renderVowelEmphasisHtml,
              },
              {
                setOnNode,
                key: 'main-nodes',
                measurable: true,
                renderNode: getNodeLabel,
              },
            ],
          },
          {
            key: 'edges-layers',
            layerType: 'svg',
            defs: [{ localId: 'arrow-head' }],
            layers: [
              {
                key: 'edges',
                markerEndId: 'arrow-head',
                edges: true,
                setOnContainer: scaleStrokeOpacity,
              },
              {
                key: 'edges-pointer-area',
                edges: true,
                setOnContainer: cacheAs('html-effects/edges-pointer-area/set-on-container', {
                  style: { cursor: 'default', opacity: 0, strokeWidth: 4 },
                }),
                setOnEdge: this.setUxOnEdge,
              },
            ],
          },
        ]}
      />
    );
  }
}
