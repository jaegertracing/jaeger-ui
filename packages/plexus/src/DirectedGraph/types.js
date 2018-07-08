// @flow

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

import type { Edge, LayoutEdge, LayoutGraph, LayoutVertex, SizeVertex, Vertex } from '../types/layout';

import LayoutManager from '../LayoutManager';

export type D3Transform = { k: number, x: number, y: number };

// TODO(joe): Optimize by removing DirectedGraphState from the node
// and edge rendering

export type DirectedGraphState = {
  edges: Edge[],
  layoutEdges: ?(LayoutEdge[]),
  layoutGraph: ?LayoutGraph,
  layoutPhase: number,
  layoutVertices: ?(LayoutVertex[]),
  sizeVertices: ?(SizeVertex[]),
  vertexRefs: { current: ?HTMLElement }[],
  vertices: Vertex[],
  zoomEnabled: boolean,
  zoomTransform: D3Transform,
};

export type DirectedGraphProps = {
  className: string,
  classNamePrefix: string,
  edges: Edge[],
  getEdgeLabel: (Edge, DirectedGraphState) => string | React.Node,
  getNodeLabel: (Vertex, DirectedGraphState) => string | React.Node,
  layoutManager: LayoutManager,
  minimap: boolean,
  minimapClassName: string,
  // setOnEdgeArrow
  setOnEdgePath: ?(Edge, DirectedGraphState) => {},
  setOnEdgesContainer: ?(DirectedGraphState) => {},
  setOnNode: ?(Vertex, DirectedGraphState) => {},
  setOnNodesContainer: ?(DirectedGraphState) => {},
  setOnRoot: ?(DirectedGraphState) => {},
  vertices: Vertex[],
  zoom: boolean,
};
