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
import { classNameIsSmall as layeredClassNameIsSmall } from '../../src/LayeredDigraph/props-factories';
import { TVertex } from '../../src/types';

import './index.css';

const { classNameIsSmall } = DirectedGraph.propsFactories;

const addAnAttr = () => ({ 'data-rando': Math.random() });
const setOnNode = (vertex: TVertex) => ({
  className: 'DemoGraph--node',
  // eslint-disable-next-line no-console
  onClick: () => console.log(vertex.key),
});

function Demo() {
  return (
    <div>
      <h1>LayeredDigraph</h1>
      <div>
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
                html: true,
                layers: [
                  {
                    setOnNode,
                    key: 'nodes',
                    measurable: true,
                    nodeRender: getLargeNodeLabel,
                  },
                ],
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

render(<Demo />, document.querySelector('#root'));
