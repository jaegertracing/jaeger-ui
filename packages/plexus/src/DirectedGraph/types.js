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

export type DirectedGraphProps = {
  classNamePrefix: string,
  edges: Edge[],
  getEdgeLabel: Edge => string | React.Node,
  getNodeLabel: Vertex => string | React.Node,
  layoutManager: LayoutManager,
  // setOnEdgeArrow
  setOnEdgePath: ?(Edge) => {},
  setOnEdgesContainer: ?(?LayoutGraph) => {},
  setOnNode: ?(Vertex) => {},
  setOnNodesContainer: ?(?LayoutGraph) => {},
  setOnRoot: ?(?LayoutGraph) => {},
  vertices: Vertex[],
};

export type DirectedGraphState = {
  edges: Edge[],
  layoutEdges: ?(LayoutEdge[]),
  layoutGraph: ?LayoutGraph,
  layoutPhase: number,
  layoutVertices: ?(LayoutVertex[]),
  sizeVertices: ?(SizeVertex[]),
  vertexRefs: { current: ?HTMLElement }[],
  vertices: Vertex[],
};
