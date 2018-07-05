// @flow

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

import DagNode from './DagNode';

import type { Span } from '../../types/trace';

export type NodeID = string;

export type DenseSpan = {
  span: Span,
  id: string,
  service: string,
  operation: string,
  tags: { [string]: any },
  parentID: ?string,
  skipToChild: boolean,
  children: Set<string>,
};

export type PVertex<T> = {
  key: string | number,
  data: DagNode<T>,
};

export type PEdge = {
  from: string | number,
  to: string | number,
};
