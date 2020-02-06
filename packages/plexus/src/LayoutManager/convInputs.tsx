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

import { TEdge, TLayoutEdge, TLayoutVertex, TSizeVertex } from '../types';

const makeEdgeId = (edge: TEdge<any>) => `${edge.from}\v${edge.to}`;

function unmapVertices<T>(
  idToVertex: Map<string, TSizeVertex<T>>,
  output: TLayoutVertex<{}>[]
): TLayoutVertex<T>[] {
  return output.map(lv => {
    const sv = idToVertex.get(lv.vertex.key);
    if (!sv) {
      throw new Error(`Unable to find Vertex for ${lv.vertex.key}`);
    }
    return { ...lv, vertex: sv.vertex };
  });
}

function unmapEdges(
  idsToEdge: Map<string, TEdge>,
  output: TLayoutEdge[]
): TLayoutEdge[] {
  return output.map(le => {
    const id = makeEdgeId(le.edge);
    const edge = idsToEdge.get(id);
    if (!edge) {
      throw new Error(`Unable to find edge for ${id}`);
    }
    return { ...le, edge };
  });
}

function mapVertices<T extends TSizeVertex, U extends TSizeVertex>(vertices: T[], prevIds?: Map<string, string>): {
    keyToId: Map<string, string>,
    idToVertex: Map<string, T | U>,
    mappedVertices: T[],
} {
  const keyToId = new Map<string, string>();
  const idToVertex = new Map<string, T | U>();
  const mappedVertices = vertices.map(v => {
    const {
      vertex: { key },
      ...rest
    } = v;
    if (keyToId.has(key) || (prevIds && prevIds.has(key))) {
      throw new Error(`Non-unique vertex key: ${key}`);
    }
    const id = String(keyToId.size + (prevIds ? prevIds.size : 0));
    keyToId.set(key, id);
    idToVertex.set(id, v);
    // TODO remove cast
    return { vertex: { key: id }, ...rest } as T;
  });
  return {
    keyToId,
    idToVertex,
    mappedVertices,
  };
}

function convToFrom(e: TEdge, keyToId: Map<string, string>): TEdge {
    // TODO DRY
    /*
    if ('edge' in e) {
      const { from, to, isBidirectional } = e.edge;
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
      idsToEdge.set(makeEdgeId(edge), e.edge);
      return {
        ...e,
        edge,
      };
    }
     */
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

// export default function convInputs(srcEdges: (TEdge<unknown> | TLayoutEdge<unknown>)[], inVertices: (TSizeVertex<unknown> | TLayoutVertex<unknown>)[]) {
export default function convInputs({
    inMoveVertices,
    inNewVertices,
    inMoveEdges,
    inNewEdges,
  }: {
    inMoveVertices: TLayoutVertex[],
    inNewVertices: TSizeVertex[],
    inMoveEdges: TLayoutEdge[],
    inNewEdges: TEdge[],
  }) {
  const { keyToId, idToVertex, mappedVertices: moveVertices } = mapVertices<TLayoutVertex, TSizeVertex>(inMoveVertices);
  const { keyToId: moreKeyToId, idToVertex: moreIdToVertex, mappedVertices: newVertices } = mapVertices<TSizeVertex, TLayoutVertex>(inNewVertices, keyToId);
  moreKeyToId.forEach((v, k) => keyToId.set(k, v));
  moreIdToVertex.forEach((v, k) => idToVertex.set(k, v));

  const idsToEdge = new Map<string, TEdge>();
  const moveEdges = inMoveEdges.map(e => {
    const { edge } = e;
    const convEdge = convToFrom(edge, keyToId);
    idsToEdge.set(makeEdgeId(convEdge), edge);
    return {
      ...e,
      edge: convEdge,
    };
  });
  const newEdges = inNewEdges.map(e => {
    const convEdge = convToFrom(e, keyToId);
    idsToEdge.set(makeEdgeId(convEdge), e);
    return convEdge;
  });
  return {
    moveVertices,
    newVertices,
    moveEdges,
    newEdges,
    unmapEdges: unmapEdges.bind(null, idsToEdge),
    unmapVertices: unmapVertices.bind(null, idToVertex),
  };
}
