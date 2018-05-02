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

import type { GraphAttrs } from '../types';
import type { Edge, Vertex } from '../../types/layout';

const round = Math.round;

const DPI = 72;

export function vertexToDot(vertex: Vertex) {
  // expect only width and height for going to dot
  const { key, height, width } = vertex;
  return {
    key,
    height: height / DPI,
    width: width / DPI,
  };
}

export function edgeToPixels(graph: GraphAttrs, edge: Edge): Edge {
  const { height: h } = graph;
  const { from, to, isBidirectional, pathPoints } = edge;
  return {
    from,
    to,
    ...(isBidirectional ? { isBidirectional } : null),
    pathPoints: pathPoints && pathPoints.map(pt => [round(pt[0] * DPI), round((h - pt[1]) * DPI)]),
  };
}

export function vertexToPixels(graph: GraphAttrs, vertex: Vertex): Vertex {
  const { height: h } = graph;
  const { key, height, left, top, width } = vertex;
  return {
    key,
    height: round(height * DPI),
    left: left != null ? round((left - width * 0.5) * DPI) : left,
    top: top != null ? round((h - top - height * 0.5) * DPI) : top,
    width: round(width * DPI),
  };
}
