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

export type LayoutGraph = {
  height: number,
  scale: number,
  width: number,
};

export type VertexKey = string | number;

export type Vertex = {
  key: VertexKey,
  label?: string | React.Node,
  data?: any,
};

export type SizeVertex = {
  vertex: Vertex,
  width: number,
  height: number,
};

export type LayoutVertex = {
  vertex: Vertex,
  height: number,
  left: number,
  top: number,
  width: number,
};

export type Edge = {
  from: VertexKey,
  to: VertexKey,
  isBidirectional?: boolean,
  label?: string | React.Node,
  data?: any,
};

export type LayoutEdge = {
  edge: Edge,
  pathPoints: [number, number][],
};

export type Cancelled = {
  isCancelled: true,
};

export type PositionsDone = {
  isCancelled: false,
  graph: LayoutGraph,
  vertices: LayoutVertex[],
};

export type LayoutDone = {
  isCancelled: false,
  edges: LayoutEdge[],
  graph: LayoutGraph,
  vertices: LayoutVertex[],
};

// export type Positions = {
// export type Positions = {
//   isCancelled: boolean,
//   graph?: LayoutGraph,
//   vertices?: LayoutVertex[],
// };

export type Layout = {
  isCancelled: boolean,
  edges?: LayoutEdge[],
  graph?: LayoutGraph,
  vertices?: LayoutVertex[],
};

export type PendingLayoutResult = {
  positions: Promise<PositionsDone | Cancelled>,
  layout: Promise<LayoutDone | Cancelled>,
};
