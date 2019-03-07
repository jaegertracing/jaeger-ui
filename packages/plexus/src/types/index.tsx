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

export type TLayoutGraph = {
  height: number;
  scale: number;
  width: number;
};

export type TVertexKey = string | number;

export type TVertex = {
  key: TVertexKey;
  label?: React.ReactNode;
  data?: any;
};

export type TSizeVertex = {
  vertex: TVertex;
  width: number;
  height: number;
};

export type TLayoutVertex = TSizeVertex & {
  left: number;
  top: number;
};

export type TEdge = {
  from: TVertexKey;
  to: TVertexKey;
  isBidirectional?: boolean;
  label?: React.ReactNode;
  data?: any;
};

export type TLayoutEdge = {
  edge: TEdge;
  pathPoints: [number, number][];
};

export type TCancelled = {
  isCancelled: true;
};

export type TPositionsDone = {
  isCancelled: false;
  graph: TLayoutGraph;
  vertices: TLayoutVertex[];
};

export type TLayoutDone = {
  isCancelled: false;
  edges: TLayoutEdge[];
  graph: TLayoutGraph;
  vertices: TLayoutVertex[];
};

// TODO(joe): delete if this is not needed
// export type TLayout = {
//   isCancelled: boolean,
//   edges?: TLayoutEdge[],
//   graph?: TLayoutGraph,
//   vertices?: TLayoutVertex[],
// };

export type TPendingLayoutResult = {
  positions: Promise<TPositionsDone | TCancelled>;
  layout: Promise<TLayoutDone | TCancelled>;
};
