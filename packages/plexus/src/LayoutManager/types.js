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

import type { LayoutEdge, LayoutGraph, LayoutVertex } from '../types/layout';

export type WorkType = 'dot-only' | 'positions' | 'edges';
export type Phase = 'not-started' | 'dot-only' | 'positions' | 'edges' | 'done';

export type LayoutOptions = {
  totalMemory?: number,
  useDotEdges?: boolean,
  splines?: string,
  sep?: number,
  rankdir?: 'TB' | 'LR' | 'BT' | 'RL',
  ranksep?: number,
  nodesep?: number,
};

type LayoutWorkerMeta = {
  layoutId: number,
  workerId: number,
  phase: 'positions' | 'edges',
};

export type WorkerMessage = {
  type: WorkType | 'layout-error',
  edges?: LayoutEdge[],
  errorMessage?: any,
  graph?: LayoutGraph,
  layoutErrorMessage?: string,
  meta: LayoutWorkerMeta,
  vertices?: LayoutVertex[],
};

export type NodesUpdate = {
  type: 'positions',
  layoutId: number,
  graph: LayoutGraph,
  vertices: LayoutVertex[],
};

export type LayoutUpdate = {
  type: 'done',
  layoutId: number,
  graph: LayoutGraph,
  edges: LayoutEdge[],
  vertices: LayoutVertex[],
};

export type Update = NodesUpdate | LayoutUpdate;
