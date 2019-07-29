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

import { TEdge, TLayoutEdge, TLayoutVertex, TSizeVertex, TVertex } from '../types';

export function matchEdges<T = Record<string, unknown>>(
  input: TEdge<T>[],
  output: TLayoutEdge<{}>[]
): TLayoutEdge<T>[] {
  const map: { [key: string]: TEdge<any> } = {};
  input.forEach(edge => {
    map[`${edge.from}\v${edge.to}`] = edge;
  });
  return output.map(le => {
    const edge = map[`${le.edge.from}\v${le.edge.to}`];
    if (!edge) {
      throw new Error(`Unable to find edge for ${le.edge.from} -> ${le.edge.to}`);
    }
    return { ...le, edge };
  });
}

export function matchVertices<T>(input: TSizeVertex<T>[], output: TLayoutVertex<{}>[]): TLayoutVertex<T>[] {
  const map: { [key: string]: TVertex<T> } = {};
  input.forEach(sv => {
    map[String(sv.vertex.key)] = sv.vertex;
  });
  return output.map(lv => {
    const vertex = map[String(lv.vertex.key)];
    if (!vertex) {
      throw new Error(`Unable to find Vertex for ${lv.vertex.key}`);
    }
    return { ...lv, vertex };
  });
}
