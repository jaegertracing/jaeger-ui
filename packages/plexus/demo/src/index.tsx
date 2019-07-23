// Copyright (c) 2019 Uber Technologies, Inc.
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

import * as React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from 'react-dom';

import largeDag, { getNodeLabel as getLargeNodeLabel } from './data-large';
import { edges as dagEdges, vertices as dagVertices } from './data-dag';
import { colored as colorData, getColorNodeLabel, setOnColorEdge, setOnColorNode } from './data-small';
import { DirectedGraph, LayoutManager } from '../../src';
import LayeredDigraph from '../../src/LayeredDigraph';
import {
  classNameIsSmall as layeredClassNameIsSmall,
  scaleProperty,
} from '../../src/LayeredDigraph/props-factories';
import { TVertex, TLayoutEdge } from '../../src/types';

import './index.css';

const { classNameIsSmall } = DirectedGraph.propsFactories;

const addAnAttr = () => ({ 'data-rando': Math.random() });
const setOnNode = (vertex: TVertex) => ({
  className: 'DemoGraph--node',
  // eslint-disable-next-line no-console
  onClick: () => console.log(vertex.key),
});

type TState = {
  hoveredEdge: TLayoutEdge<any> | null;
};

class Demo extends React.PureComponent<{}, TState> {
  state: TState = {
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

  render() {
    const { hoveredEdge } = this.state;
    return (
      <div>
        <h1>LayeredDigraph</h1>
        <div>
          <p>
            hovered edge:{' '}
            {hoveredEdge && (
              <span>
                <strong>{hoveredEdge.edge.from}</strong> → <strong>{hoveredEdge.edge.to}</strong>
              </span>
            )}
          </p>
          <div className="DemoGraph">
            <LayeredDigraph
              zoom
              minimap
              className="DemoGraph--dag"
              layoutManager={new LayoutManager({ useDotEdges: true })}
              minimapClassName="Demo--miniMap"
              setOnGraph={layeredClassNameIsSmall}
              measurableNodesKey="nodes"
              layers={[
                {
                  key: 'nodes-layers',
                  layerType: 'html',
                  layers: [
                    {
                      setOnNode,
                      key: 'nodes',
                      measurable: true,
                      nodeRender: getLargeNodeLabel,
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
                      setOnContainer: scaleProperty.strokeOpacity,
                    },
                    {
                      key: 'edges-pointer-area',
                      edges: true,
                      setOnContainer: { style: { cursor: 'default', opacity: 0, strokeWidth: 4 } },
                      // eslint-disable-next-line no-console
                      setOnEdge: (...args) => ({
                        onMouseOver: () => this.onEdgeEnter(args[0]),
                        onMouseOut: () => this.onEdgeExit(args[0]),
                      }),
                    },
                  ],
                },
              ]}
              {...largeDag}
            />
          </div>
        </div>
        <h1>LayeredDigraph with standalone layers</h1>
        <h3>TODO: Indicate the relevance of standalone layers vs groups</h3>
        <div>
          <div className="DemoGraph">
            <LayeredDigraph
              zoom
              minimap
              className="DemoGraph--dag"
              layoutManager={new LayoutManager({ useDotEdges: false })}
              minimapClassName="Demo--miniMap"
              setOnGraph={layeredClassNameIsSmall}
              measurableNodesKey="nodes"
              layers={[
                {
                  setOnNode,
                  key: 'nodes',
                  layerType: 'html',
                  measurable: true,
                  nodeRender: getLargeNodeLabel,
                },
                {
                  key: 'edges-visible-path',
                  defs: [{ localId: 'arrowHead' }],
                  edges: true,
                  layerType: 'svg',
                  markerEndId: 'arrowHead',
                  setOnContainer: [{ className: 'DdgGraph--edges' }, scaleProperty.strokeOpacity],
                  // TODO: demo this
                  // setOnEdge: this.setOnEdge,
                },
              ]}
              {...largeDag}
            />
          </div>
        </div>
        <h1>Directed graph with cycles - dot edges</h1>
        <div>
          <div className="DemoGraph">
            <DirectedGraph
              zoom
              minimap
              arrowScaleDampener={0.8}
              className="DemoGraph--dag"
              getNodeLabel={getLargeNodeLabel}
              layoutManager={new LayoutManager({ useDotEdges: true })}
              minimapClassName="Demo--miniMap"
              setOnNode={setOnNode}
              setOnRoot={classNameIsSmall}
              {...largeDag}
            />
          </div>
        </div>
        <h1>Directed graph with cycles - neato edges</h1>
        <div>
          <div className="DemoGraph">
            <DirectedGraph
              zoom
              minimap
              arrowScaleDampener={0.8}
              className="DemoGraph--dag"
              getNodeLabel={getLargeNodeLabel}
              layoutManager={new LayoutManager()}
              minimapClassName="Demo--miniMap"
              setOnNode={setOnNode}
              setOnRoot={classNameIsSmall}
              {...largeDag}
            />
          </div>
        </div>
        <h1>Directed graph with cycles - dot edges - polylines</h1>
        <div>
          <div className="DemoGraph">
            <DirectedGraph
              zoom
              minimap
              arrowScaleDampener={0.8}
              className="DemoGraph--dag"
              getNodeLabel={getLargeNodeLabel}
              layoutManager={
                new LayoutManager({
                  useDotEdges: true,
                  splines: 'polyline',
                  ranksep: 8,
                })
              }
              minimapClassName="Demo--miniMap"
              setOnNode={setOnNode}
              setOnRoot={classNameIsSmall}
              {...largeDag}
            />
          </div>
        </div>
        <h1>Small graph with data driven rendering</h1>
        <DirectedGraph
          className="DemoGraph--dag"
          getNodeLabel={colorData ? getColorNodeLabel : null}
          layoutManager={new LayoutManager()}
          setOnEdgePath={colorData ? setOnColorEdge : null}
          setOnEdgesContainer={addAnAttr}
          setOnNode={colorData ? setOnColorNode : null}
          setOnNodesContainer={addAnAttr}
          {...colorData}
        />
        <h1>Medium DAG</h1>
        <div className="DemoGraph">
          <DirectedGraph
            className="DemoGraph--dag"
            edges={dagEdges}
            layoutManager={new LayoutManager({ useDotEdges: true })}
            minimapClassName="Demo--miniMap"
            setOnNode={setOnNode}
            vertices={dagVertices}
            minimap
            zoom
          />
        </div>
      </div>
    );
  }
}

render(<Demo />, document.querySelector('#root'));
