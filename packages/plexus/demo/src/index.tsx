// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Radio, Tabs } from 'antd';
import type { RadioChangeEvent } from 'antd';

import largeDag, { getNodeLabel as getLargeNodeLabel, TLargeNode } from './data-large';
import { edges as dagEdges, vertices as dagVertices } from './data-dag';
import { colored as colorData, getColorNodeLabel, setOnColorEdge, setOnColorNode } from './data-small';
import { Digraph, LayoutManager } from '../../src';
import cacheAs from '../../src/cacheAs';
import { TLayer, TRendererUtils, TMeasureNodeUtils } from '../../src/Digraph/types';
import { TVertex, TLayoutEdge, TLayoutVertex } from '../../src/types';
import TNonEmptyArray from '../../src/types/TNonEmptyArray';

import './index.css';

type TGraphSize = 'small' | 'large';

type TState = {
  graphSize: TGraphSize;
  hoveredEdge: TLayoutEdge<any> | null;
};

const { classNameIsSmall: layeredClassNameIsSmall, scaleStrokeOpacity } = Digraph.propsFactories;

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

const setOnNode = (vertex: TVertex) => ({
  className: 'DemoGraph--node',

  onClick: () => console.log(vertex.key),
});

function renderVowelEmphasisHtml(lv: TLayoutVertex<any>) {
  return VOWELS.has(lv.vertex.key[0]) ? <div className="DemoGraph--node--emphasized" /> : null;
}

function renderVowelEmphasisBorderSvg(lv: TLayoutVertex<any>) {
  if (!VOWELS.has(lv.vertex.key[0])) {
    return null;
  }
  return (
    <g>
      <rect
        className="DemoGraph--node--vectorEmphasized-border"
        vectorEffect="non-scaling-stroke"
        width={lv.width}
        height={lv.height}
      />
    </g>
  );
}

function renderVowelEmphasisSvg(lv: TLayoutVertex<any>) {
  if (!VOWELS.has(lv.vertex.key[0])) {
    return null;
  }
  return (
    <g>
      <rect
        className="DemoGraph--node--vectorEmphasized"
        vectorEffect="non-scaling-stroke"
        width={lv.width}
        height={lv.height}
      />
    </g>
  );
}

function renderNodeVectorBorder(lv: TLayoutVertex<any>) {
  return (
    <rect
      className="DemoGraph--node--vectorBorder"
      vectorEffect="non-scaling-stroke"
      width={lv.width}
      height={lv.height}
    />
  );
}

export default class Demo extends React.PureComponent<{}, TState> {
  state: TState = {
    graphSize: 'large',
    hoveredEdge: null,
  };

  hovering: TLayoutEdge<any> | null = null;

  private updateHoveredState = (props: {}, state: TState) => {
    const { hoveredEdge } = state;
    if (hoveredEdge !== this.hovering) {
      return { hoveredEdge: this.hovering };
    }
    return null;
  };

  private setOnNode = (vertex: TVertex) => ({
    className: 'DemoGraph--node',
    onClick: () => console.log(vertex.key),
  });

  private setUxOnEdge = (layoutEdge: TLayoutEdge<any>) => ({
    onMouseOver: () => this.onEdgeEnter(layoutEdge),
    onMouseOut: () => this.onEdgeExit(layoutEdge),
  });

  private onEdgeEnter = (le: TLayoutEdge<any>) => {
    this.hovering = le;
    this.setState(this.updateHoveredState);
  };

  private onEdgeExit = (le: TLayoutEdge<any>) => {
    if (this.hovering === le) {
      this.hovering = null;
    }
    this.setState(this.updateHoveredState);
  };

  private getLayersA(): TNonEmptyArray<TLayer<any, any>> {
    return [
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
            renderNode: getLargeNodeLabel,
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
    ];
  }

  private getLayersB(): TNonEmptyArray<TLayer<any, any>> {
    return [
      {
        key: 'emph-nodes-border',
        layerType: 'svg',
        renderNode: renderVowelEmphasisBorderSvg,
      },
      {
        key: 'emph-nodes-html',
        layerType: 'html',
        renderNode: renderVowelEmphasisHtml,
      },
      {
        key: 'node-effects-svg-layer',
        layerType: 'svg',
        layers: [
          {
            key: 'emph-nodes',
            renderNode: renderVowelEmphasisSvg,
          },
          {
            key: 'border-nodes',
            renderNode: renderNodeVectorBorder,
          },
        ],
      },
      {
        setOnNode: cacheAs('svg-effects/nodes/set-on-node', [setOnNode, { className: 'is-vector-bordered' }]),
        key: 'nodes',
        layerType: 'html',
        measurable: true,
        renderNode: getLargeNodeLabel,
      },
      {
        key: 'edges-visible-path',
        defs: [{ localId: 'arrowHead' }],
        edges: true,
        layerType: 'svg',
        markerEndId: 'arrowHead',
        setOnContainer: cacheAs('svg-effects/edges-visible-path/set-on-node', [
          { className: 'DdgGraph--edges' },
          scaleStrokeOpacity,
        ]),
      },
      {
        key: 'edges-pointer-area',
        edges: true,
        layerType: 'svg',
        setOnContainer: cacheAs('svg-effects/edges-pointer-area/set-on-container', {
          style: { cursor: 'default', opacity: 0, strokeWidth: 4 },
        }),
        setOnEdge: this.setUxOnEdge,
      },
    ];
  }

  private onGraphSizeChange = (e: RadioChangeEvent) => {
    this.setState({ graphSize: e.target.value });
  };

  private renderSizeToggle() {
    const { graphSize } = this.state;
    return (
      <div className="PlexusDemo--sizeToggle">
        <Radio.Group value={graphSize} onChange={this.onGraphSizeChange}>
          <Radio.Button value="small">Small</Radio.Button>
          <Radio.Button value="large">Large</Radio.Button>
        </Radio.Group>
        <span className="PlexusDemo--sizeHint">
          {graphSize === 'small'
            ? 'Node labels are hidden at small size to show graph structure only.'
            : 'Full size with visible node labels and interactive edge hover tracking.'}
        </span>
      </div>
    );
  }

  private renderHtmlEffects() {
    const { graphSize, hoveredEdge } = this.state;
    const layers = this.getLayersA();
    const isSmall = graphSize === 'small';
    return (
      <>
        {this.renderSizeToggle()}
        <p>
          hovered edge:{' '}
          {hoveredEdge && (
            <span>
              <strong>{hoveredEdge.edge.from}</strong> → <strong>{hoveredEdge.edge.to}</strong>
            </span>
          )}
        </p>
        <div key={graphSize} className={`DemoGraph ${isSmall ? 'is-small' : 'is-fluid'}`}>
          <Digraph
            zoom
            minimap
            className="DemoGraph--dag"
            layoutManager={new LayoutManager({ useDotEdges: true })}
            minimapClassName="Demo--miniMap"
            setOnGraph={layeredClassNameIsSmall}
            measurableNodesKey="main-nodes"
            layers={layers}
            {...largeDag}
          />
        </div>
      </>
    );
  }

  private renderSvgEffects() {
    const { graphSize, hoveredEdge } = this.state;
    const layers = this.getLayersB();
    const isSmall = graphSize === 'small';
    return (
      <>
        {this.renderSizeToggle()}
        <p>
          hovered edge:{' '}
          {hoveredEdge && (
            <span>
              <strong>{hoveredEdge.edge.from}</strong> → <strong>{hoveredEdge.edge.to}</strong>
            </span>
          )}
        </p>
        <div key={graphSize} className={`DemoGraph ${isSmall ? 'is-small' : 'is-fluid'}`}>
          <Digraph
            zoom
            minimap
            className="DemoGraph--dag"
            layoutManager={new LayoutManager({ useDotEdges: true })}
            minimapClassName="Demo--miniMap"
            setOnGraph={layeredClassNameIsSmall}
            measurableNodesKey="nodes"
            layers={layers}
            {...largeDag}
          />
        </div>
      </>
    );
  }

  private renderMeasurableSvgNodes() {
    return (
      <div className="DemoGraph is-fluid">
        <Digraph<TLargeNode>
          zoom
          minimap
          className="DemoGraph--dag"
          layoutManager={new LayoutManager({ useDotEdges: true })}
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
          edges={largeDag.edges}
          vertices={largeDag.vertices}
        />
      </div>
    );
  }

  private renderNeatoEdgesTb() {
    return (
      <div className="DemoGraph is-fluid">
        <Digraph<TLargeNode>
          zoom
          minimap
          className="DemoGraph--dag"
          layoutManager={new LayoutManager({ useDotEdges: false, nodesep: 7, ranksep: 10, rankdir: 'TB' })}
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
                'svg-nodes-tb/nodes/render',
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
                      {vertex.service}
                    </text>
                  </>
                )
              ),
            },
          ]}
          edges={largeDag.edges.map(edge => ({
            from: edge.from.repeat(8),
            to: edge.to.repeat(8),
          }))}
          vertices={largeDag.vertices.map(vtx => ({
            ...vtx,
            key: vtx.key.repeat(8),
          }))}
        />
      </div>
    );
  }

  private renderCyclesDotEdges() {
    return (
      <div className="DemoGraph is-fluid">
        <Digraph
          zoom
          minimap
          className="DemoGraph--dag"
          layoutManager={new LayoutManager({ useDotEdges: true })}
          minimapClassName="Demo--miniMap"
          measurableNodesKey="nodes"
          layers={[
            {
              key: 'edges',
              defs: [{ localId: 'arrowHead' }],
              edges: true,
              layerType: 'svg',
              markerEndId: 'arrowHead',
              setOnContainer: cacheAs('edges/set-on-container', [
                { className: 'DdgGraph--edges' },
                scaleStrokeOpacity,
              ]),
            },
            {
              key: 'nodes',
              layerType: 'html',
              measurable: true,
              setOnNode: this.setOnNode,
              renderNode: getLargeNodeLabel,
            },
          ]}
          {...largeDag}
        />
      </div>
    );
  }

  private renderCyclesNeatoEdges() {
    return (
      <div className="DemoGraph is-fluid">
        <Digraph
          zoom
          minimap
          className="DemoGraph--dag"
          layoutManager={new LayoutManager({ useDotEdges: false })}
          minimapClassName="Demo--miniMap"
          measurableNodesKey="nodes"
          layers={[
            {
              key: 'edges',
              defs: [{ localId: 'arrowHead' }],
              edges: true,
              layerType: 'svg',
              markerEndId: 'arrowHead',
              setOnContainer: cacheAs('neato-edges/set-on-container', [
                { className: 'DdgGraph--edges' },
                scaleStrokeOpacity,
              ]),
            },
            {
              key: 'nodes',
              layerType: 'html',
              measurable: true,
              setOnNode: this.setOnNode,
              renderNode: getLargeNodeLabel,
            },
          ]}
          {...largeDag}
        />
      </div>
    );
  }

  private renderCyclesPolylines() {
    return (
      <div className="DemoGraph is-fluid">
        <Digraph
          zoom
          minimap
          className="DemoGraph--dag"
          layoutManager={
            new LayoutManager({
              useDotEdges: true,
              splines: 'polyline',
              ranksep: 8,
            })
          }
          minimapClassName="Demo--miniMap"
          measurableNodesKey="nodes"
          layers={[
            {
              key: 'edges',
              defs: [{ localId: 'arrowHead' }],
              edges: true,
              layerType: 'svg',
              markerEndId: 'arrowHead',
              setOnContainer: cacheAs('polyline-edges/set-on-container', [
                { className: 'DdgGraph--edges' },
                scaleStrokeOpacity,
              ]),
            },
            {
              key: 'nodes',
              layerType: 'html',
              measurable: true,
              setOnNode: this.setOnNode,
              renderNode: getLargeNodeLabel,
            },
          ]}
          {...largeDag}
        />
      </div>
    );
  }

  private renderSmallGraphDataDriven() {
    return (
      <div className="DemoGraph is-fluid">
        <Digraph
          className="DemoGraph--dag"
          zoom
          minimap
          layoutManager={new LayoutManager()}
          measurableNodesKey="nodes"
          layers={[
            {
              key: 'edges',
              defs: [{ localId: 'arrowHead' }],
              edges: true,
              layerType: 'svg',
              markerEndId: 'arrowHead',
              setOnContainer: scaleStrokeOpacity,
              setOnEdge: setOnColorEdge,
            },
            {
              key: 'nodes',
              layerType: 'html',
              measurable: true,
              setOnNode: setOnColorNode,
              renderNode: getColorNodeLabel,
            },
          ]}
          {...colorData}
        />
      </div>
    );
  }

  private renderMediumDag() {
    return (
      <div className="DemoGraph is-fluid">
        <Digraph
          zoom
          minimap
          className="DemoGraph--dag"
          layoutManager={new LayoutManager({ useDotEdges: true })}
          minimapClassName="Demo--miniMap"
          measurableNodesKey="nodes"
          layers={[
            {
              key: 'edges',
              defs: [{ localId: 'arrowHead' }],
              edges: true,
              layerType: 'svg',
              markerEndId: 'arrowHead',
              setOnContainer: scaleStrokeOpacity,
            },
            {
              key: 'nodes',
              layerType: 'html',
              measurable: true,
              setOnNode: this.setOnNode,
              renderNode: (vertex: TVertex) => vertex.key,
            },
          ]}
          edges={dagEdges}
          vertices={dagVertices}
        />
      </div>
    );
  }

  render() {
    const tabItems = [
      { key: 'html-effects', label: 'HTML node effects', children: this.renderHtmlEffects() },
      { key: 'svg-effects', label: 'SVG node effects', children: this.renderSvgEffects() },
      {
        key: 'measurable-svg-nodes',
        label: 'Measurable SVG nodes',
        children: this.renderMeasurableSvgNodes(),
      },
      { key: 'neato-edges-tb', label: 'Neato edges (TB)', children: this.renderNeatoEdgesTb() },
      { key: 'cycles-dot-edges', label: 'Cycles - dot edges', children: this.renderCyclesDotEdges() },
      {
        key: 'cycles-neato-edges',
        label: 'Cycles - neato edges',
        children: this.renderCyclesNeatoEdges(),
      },
      { key: 'cycles-dot-polylines', label: 'Cycles - polylines', children: this.renderCyclesPolylines() },
      {
        key: 'small-graph-data-driven',
        label: 'Small graph (data driven)',
        children: this.renderSmallGraphDataDriven(),
      },
      { key: 'medium-dag', label: 'Medium DAG', children: this.renderMediumDag() },
    ];
    return (
      <div className="PlexusDemo">
        <h1 className="PlexusDemo--title">Plexus Demo</h1>
        <Tabs tabPosition="left" items={tabItems} destroyInactiveTabPane className="PlexusDemo--tabs" />
      </div>
    );
  }
}
