// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import { render } from 'react-dom';

import { LayoutManager } from '../../src';
import Digraph from '../../src/Digraph';
import { TVertex } from '../../src/types';

const vertices = [
  { key: 'web', name: 'web-app : login' },
  { key: 'users', name: 'user-store : get-user' },
  { key: 'cache', name: 'cache : get' },
  { key: 'db', name: 'db : get-user' },
  { key: 'auth', name: 'auth : login' },
];

// Edges must refer to the `key` field of vertices.
const edges = [
  { from: 'web', to: 'users' },
  { from: 'web', to: 'auth' },
  { from: 'users', to: 'cache' },
  { from: 'users', to: 'db' },
];

const lm = new LayoutManager({ useDotEdges: true, rankdir: 'TB', ranksep: 1.1 });

const UxEdges = () => (
  <Digraph
    edges={edges}
    vertices={vertices}
    setOnGraph={{
      style: {
        fontFamily: 'sans-serif',
        height: '100%',
        position: 'fixed',
        width: '100%',
      },
    }}
    layoutManager={lm}
    measurableNodesKey="nodes"
    layers={[
      {
        key: 'edges-layers',
        layerType: 'svg',
        defs: [{ localId: 'arrow-head' }],
        layers: [
          {
            key: 'edges',
            markerEndId: 'arrow-head',
            edges: true,
          },
          {
            key: 'edges-pointer-area',
            edges: true,
            setOnContainer: { style: { cursor: 'default', opacity: 0, strokeWidth: 4 } },
            setOnEdge: layoutEdge => ({
              onMouseOver: () => console.log('mouse over', layoutEdge),

              onMouseOut: () => console.log('mouse out', layoutEdge),
            }),
          },
        ],
      },
      {
        key: 'nodes',
        layerType: 'html',
        measurable: true,
        renderNode: (vertex: TVertex<{ name: string }>) => vertex.name,
        setOnNode: { style: { padding: '1rem', whiteSpace: 'nowrap', background: '#e8e8e8' } },
      },
    ]}
  />
);

render(<UxEdges />, document.querySelector('#root'));
