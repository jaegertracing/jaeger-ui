// Copyright (c) 2019 Uber Technologies, Inc.
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

import { TGetLayout } from './types';
import { TEdge, TLayoutEdge, TLayoutVertex, TSizeVertex } from '../types';

const makeEdgeId = (edge: TEdge<any>) => `${edge.from}\v${edge.to}`;

function unmapVertices<T = unknown>(
  idToVertex: Map<string, TSizeVertex<T>>,
  output: Map<string, TLayoutVertex<T>>
): Map<string, TLayoutVertex<T>> {
  const rv = new Map<string, TLayoutVertex<T>>();
  output.forEach((lv, id) => {
    const sv = idToVertex.get(id);
    if (!sv) {
      throw new Error(`Unable to find Vertex for ${lv.vertex.key}`);
    }
    rv.set(sv.vertex.key, { ...lv, vertex: sv.vertex });
  });
  return rv;
}

function unmapEdges(idsToEdge: Map<string, TEdge>, output: Map<TEdge, TLayoutEdge>): Map<TEdge, TLayoutEdge> {
  const rv = new Map<TEdge, TLayoutEdge>();
  output.forEach((le, e) => {
    const id = makeEdgeId(e);
    const edge = idsToEdge.get(id);
    if (!edge) {
      throw new Error(`Unable to find edge for ${id}`);
    }
    rv.set(edge, { ...le, edge });
  });
  return rv;
}

function mapVertices<T extends TSizeVertex, U extends TSizeVertex>(
  vertices: Map<string, T>,
  prevIds?: Map<string, string>
): {
  keyToId: Map<string, string>;
  idToVertex: Map<string, T | U>;
  mappedVertices: Map<string, T>;
} {
  const keyToId = new Map<string, string>();
  const idToVertex = new Map<string, T | U>();
  const mappedVertices = new Map();
  vertices.forEach((v, key) => {
    if (keyToId.has(key) || (prevIds && prevIds.has(key))) {
      throw new Error(`Non-unique vertex key: ${key}`);
    }
    const id = String(keyToId.size + (prevIds ? prevIds.size : 0));
    keyToId.set(key, id);
    idToVertex.set(id, v);
    mappedVertices.set(id, { ...v, vertex: { key: id } });
  });
  return {
    keyToId,
    idToVertex,
    mappedVertices,
  };
}

function convToFrom(e: TEdge, keyToId: Map<string, string>): TEdge {
  const { from, to, isBidirectional } = e;
  const fromId = keyToId.get(from);
  const toId = keyToId.get(to);
  if (fromId == null) {
    throw new Error(`Unrecognized key on edge, from: ${from}`);
  }
  if (toId == null) {
    throw new Error(`Unrecognized key on edge, to: ${to}`);
  }
  const edge = {
    isBidirectional,
    from: fromId,
    to: toId,
  };
  return edge;
}

export default function convInputs({
  inPositionedVertices,
  inNewVertices,
  inPositionedEdges,
  inNewEdges,
}: {
  inPositionedVertices: TGetLayout['positionedVertices'];
  inNewVertices: TGetLayout['newVertices'];
  inPositionedEdges: TGetLayout['positionedEdges'];
  inNewEdges: TGetLayout['newEdges'];
}) {
  const { keyToId, idToVertex, mappedVertices: positionedVertices } = mapVertices<TLayoutVertex, TSizeVertex>(
    inPositionedVertices
  );
  const { keyToId: moreKeyToId, idToVertex: moreIdToVertex, mappedVertices: newVertices } = mapVertices<
    TSizeVertex,
    TLayoutVertex
  >(inNewVertices, keyToId);
  moreKeyToId.forEach((v, k) => keyToId.set(k, v));
  moreIdToVertex.forEach((v, k) => idToVertex.set(k, v));

  const idsToEdge = new Map<string, TEdge>();
  const positionedEdges = new Map<TEdge, TLayoutEdge>();
  inPositionedEdges.forEach((le, e) => {
    const convEdge = convToFrom(e, keyToId);
    idsToEdge.set(makeEdgeId(convEdge), e);
    positionedEdges.set(convEdge, {
      ...le,
      edge: convEdge,
    });
  });
  const newEdges = inNewEdges.map(e => {
    const convEdge = convToFrom(e, keyToId);
    idsToEdge.set(makeEdgeId(convEdge), e);
    return convEdge;
  });
  return {
    positionedVertices,
    newVertices,
    positionedEdges,
    newEdges,
    unmapEdges: unmapEdges.bind(null, idsToEdge),
    unmapVertices: unmapVertices.bind(null, idToVertex),
  };
}
