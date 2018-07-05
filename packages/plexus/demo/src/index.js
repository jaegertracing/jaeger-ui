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
import { varied, colored, getColorNodeLabel, setOnColorEdge, setOnColorNode } from './data-small';
import { DirectedGraph, LayoutManager } from '../../src';

import './index.css';

const addAnAttr = () => ({ 'data-rando': Math.random() });

const addNodeDemoCss = () => ({ className: 'Node' });

class Demo extends React.Component {
  state = {
    data: colored,
    colorData: true,
  };

  constructor(props) {
    super(props);
    this.layoutManager = new LayoutManager();
    this.dagLayoutManager = new LayoutManager({ useDotEdges: true });
    this.largeLayoutManager = new LayoutManager();
  }

  handleClick = () => {
    const { colorData } = this.state;
    this.setState({
      colorData: !colorData,
      data: colorData ? varied : colored,
    });
  };

  render() {
    const { data, colorData } = this.state;
    return (
      <div>
        <h1>
          <a href="#" onClick={this.handleClick}>
            plexus Demo
          </a>
        </h1>
        <h1>Small graph with data driven rendering</h1>
        <DirectedGraph
          layoutManager={this.layoutManager}
          getNodeLabel={colorData ? getColorNodeLabel : null}
          setOnEdgePath={colorData ? setOnColorEdge : null}
          setOnNode={colorData ? setOnColorNode : null}
          setOnEdgesContainer={addAnAttr}
          setOnNodesContainer={addAnAttr}
          setOnRoot={addAnAttr}
          {...data}
        />
        <h1>Medium DAG</h1>
        <DirectedGraph
          layoutManager={this.dagLayoutManager}
          setOnNode={addNodeDemoCss}
          edges={dagEdges}
          vertices={dagVertices}
        />
        <h1>Larger directd graph with cycles</h1>
        <DirectedGraph
          layoutManager={this.largeLayoutManager}
          getNodeLabel={getLargeNodeLabel}
          setOnNode={addNodeDemoCss}
          {...largeDg}
        />
      </div>
    );
  }
}

render(<Demo />, document.querySelector('#demo'));
