// Copyright (c) 2018 Uber Technologies, Inc.
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

export type TVertex<T = any> = T & {
  key: TVertexKey;
  label?: React.ReactNode;
};

export type TSizeVertex<T = any> = {
  vertex: TVertex<T>;
  width: number;
  height: number;
};

export type TLayoutVertex<T = any> = TSizeVertex<T> & {
  left: number;
  top: number;
};

export type TEdge<T = any> = {
  from: TVertexKey;
  to: TVertexKey;
  isBidirectional?: boolean;
  label?: React.ReactNode;
  data?: T;
};

export type TLayoutEdge<T = any> = {
  edge: TEdge<T>;
  pathPoints: [number, number][];
};

export type TCancelled = {
  isCancelled: true;
};

export type TPositionsDone<T = any> = {
  isCancelled: false;
  graph: TLayoutGraph;
  vertices: TLayoutVertex<T>[];
};

export type TLayoutDone<T = any> = {
  isCancelled: false;
  edges: TLayoutEdge[];
  graph: TLayoutGraph;
  vertices: TLayoutVertex<T>[];
};

export type TPendingLayoutResult<T = any> = {
  positions: Promise<TPositionsDone<T> | TCancelled>;
  layout: Promise<TLayoutDone<T> | TCancelled>;
};
