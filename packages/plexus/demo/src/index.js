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

import * as React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from 'react-dom';

import largeDg, { getNodeLabel as getLargeNodeLabel } from './data-large';
import { edges as dagEdges, vertices as dagVertices } from './data-dag';
import { colored as colorData, getColorNodeLabel, setOnColorEdge, setOnColorNode } from './data-small';
import { DirectedGraph, LayoutManager } from '../../src';

import './index.css';

const { classNameIsSmall } = DirectedGraph.propsFactories;

const addAnAttr = () => ({ 'data-rando': Math.random() });
const setNodeClassName = () => ({ className: 'DemoGraph--node' });

class Demo extends React.Component {
  constructor(props) {
    super(props);
    this.layoutManager = new LayoutManager();
    this.dagLayoutManager = new LayoutManager({ useDotEdges: true });
    this.largeDotLayoutManager = new LayoutManager({ useDotEdges: true });
    this.largeNeatoLayoutManager = new LayoutManager();
  }
  render() {
    return (
      <div>
        <h1>Directed graph with cycles - dot edges</h1>
        <div>
          <div className="DemoGraph">
            <DirectedGraph
              zoom
              minimap
              arrowScaleDampener={0.8}
              className="DemoGraph--dag"
              getNodeLabel={getLargeNodeLabel}
              layoutManager={this.largeDotLayoutManager}
              minimapClassName="Demo--miniMap"
              setOnNode={setNodeClassName}
              setOnRoot={classNameIsSmall}
              {...largeDg}
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
              layoutManager={this.largeNeatoLayoutManager}
              minimapClassName="Demo--miniMap"
              setOnNode={setNodeClassName}
              setOnRoot={classNameIsSmall}
              {...largeDg}
            />
          </div>
        </div>
        <h1>Small graph with data driven rendering</h1>
        <DirectedGraph
          className="DemoGraph--da-g"
          getNodeLabel={colorData ? getColorNodeLabel : null}
          layoutManager={this.layoutManager}
          setOnEdgePath={colorData ? setOnColorEdge : null}
          setOnEdgesContainer={addAnAttr}
          setOnNode={colorData ? setOnColorNode : null}
          setOnNodesContainer={addAnAttr}
          {...colorData}
        />
        <h1>Medium DAG</h1>
        <DirectedGraph
          className="DemoGraph--dag"
          edges={dagEdges}
          layoutManager={this.dagLayoutManager}
          setOnNode={setNodeClassName}
          vertices={dagVertices}
        />
      </div>
    );
  }
}

render(<Demo />, document.querySelector('#demo'));
