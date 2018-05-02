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

import type { Edge, Vertex } from '../types/layout';

export type GraphAttrs = {
  height: number,
  scale: number,
  width: number,
};

type LayoutWorkerMeta = {
  layoutId: number,
  workerId: number,
  phase: 'positions' | 'edges',
};

export type WorkerMessage = {
  type: 'positions' | 'edges' | 'layout-error' | 'error',
  meta: LayoutWorkerMeta,
  edges?: Edge[],
  errorMessage?: any,
  layoutErrorMessage?: string,
  vertices?: Vertex[],
  graph?: { height: number, scale: number, width: number },
};

export type LayoutUpdate = {
  type: 'positions' | 'edges',
  layoutId: number,
  edges?: Edge[],
  vertices?: Vertex[],
};
