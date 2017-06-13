// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import PropTypes from 'prop-types';
import React from 'react';
import cytoscape from 'cytoscape';
import cydagre from 'cytoscape-dagre';
import dagre from 'dagre';

cydagre(cytoscape, dagre);

export default class DAG extends React.Component {
  static get propTypes() {
    return {
      serviceCalls: PropTypes.arrayOf(
        PropTypes.shape({
          parent: PropTypes.string,
          child: PropTypes.string,
          callCount: PropTypes.number,
        })
      ),
    };
  }
  componentDidMount() {
    const { serviceCalls } = this.props;
    const nodeMap = {};
    const nodes = [];
    const edges = [];
    serviceCalls.forEach(d => {
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
    });
    cytoscape({
      container: document.getElementById('cy'),
      boxSelectionEnabled: false,
      autounselectify: true,
      layout: {
        name: 'dagre',
      },
      minZoom: 0.5,
      style: [
        {
          selector: 'node',
          style: {
            content: 'data(id)',
            'text-opacity': 0.5,
            'text-valign': 'center',
            'text-halign': 'right',
            'background-color': '#11939A',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 4,
            label: 'data(label)',
            'target-arrow-shape': 'triangle',
            'line-color': 'gray',
            'target-arrow-color': 'gray',
            'curve-style': 'bezier',
          },
        },
      ],
      elements: {
        nodes,
        edges,
      },
    });
  }

  render() {
    return (
      <div
        id="cy"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          left: 0,
          top: 0,
        }}
      />
    );
  }
}
