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

import { TEdge } from '@jaegertracing/plexus/lib/types';

import { compareKeys } from './visibility-key';

import { EDdgEdgeKeys, PathElem, DdgVertex, TDdgModel } from './types';

export default class DdgEVManager {
  private edges: Set<TEdge>;
  private prevVisKey: string;
  private pathElemToVertex: Map<PathElem, DdgVertex>;
  private vertices: Map<string, DdgVertex>;
  private visIdxToPathElem: Map<number, PathElem>;

  constructor({ ddgModel }: { ddgModel: TDdgModel }) {
    this.edges = new Set();
    this.prevVisKey = '';
    this.pathElemToVertex = new Map();
    this.vertices = new Map();
    this.visIdxToPathElem = ddgModel.visIdxToPathElem;
  }

  private addElems = (newIndices: number[]) => {
    newIndices.forEach(newIdx => {
      // If there is a compatible vertex for this visIdx, use it, else, make a new vertex
      const pathElem = this.visIdxToPathElem.get(newIdx);
      if (!pathElem) {
        throw new Error(`Given visibilityIdx: "${newIdx}" that does not exist`);
      }

      const key = this.getVertexKey(pathElem);
      let vertex = this.vertices.get(key);
      if (!vertex) {
        vertex = new DdgVertex({ key });
        this.vertices.set(key, vertex);
      }

      // Create bi-directional links between the vertex and its PathElms
      this.pathElemToVertex.set(pathElem, vertex);
      vertex.pathElems.add(pathElem);

      // If the newly-visible PathElem is not the focalNode, it needs to be connected to the rest of the graph
      const connectedElem = pathElem.focalSideNeighbor;
      if (connectedElem) {
        const connectedVertex = this.pathElemToVertex.get(connectedElem);
        if (!connectedVertex) {
          throw new Error(`Non-focal pathElem lacks connectedVertex. PathElem: ${pathElem}`);
        }

        if (!vertex[pathElem.focalSideEdgesKey].has(connectedVertex)) {
          const newEdge: TEdge =
            pathElem.focalSideEdgesKey === EDdgEdgeKeys.ingressEdges
              ? {
                  from: connectedVertex.key,
                  to: vertex.key,
                }
              : {
                  from: vertex.key,
                  to: connectedVertex.key,
                };
          vertex[pathElem.focalSideEdgesKey].set(connectedVertex, newEdge);
          connectedVertex[pathElem.farSideEdgesKey].set(vertex, newEdge);
          this.edges.add(newEdge);
        }
      }
    });
  };

  private removeElems = (removeIndices: number[]) => {
    removeIndices.forEach(removeIdx => {
      // Find the corresponding vertex for this visIdx
      const pathElem = this.visIdxToPathElem.get(removeIdx);
      if (!pathElem) {
        throw new Error(`Given visibilityIdx: "${removeIdx}" that does not exist`);
      }
      const key = this.getVertexKey(pathElem);
      const vertex = this.vertices.get(key);
      if (!vertex) {
        throw new Error(`Attempting to remove PathElem without vertex: ${pathElem}`);
      }

      // Remove the bi-directional links between the vertex and the now-hidden PathElem
      this.pathElemToVertex.delete(pathElem);
      vertex.pathElems.delete(pathElem);

      // If the last visibile PathElem for this vertex is now hidden, remove the vertex and all edges to and
      // from this vertex
      if (vertex.pathElems.size === 0) {
        this.vertices.delete(key);
        vertex.egressEdges.forEach((egressEdge, connectedVertex) => {
          connectedVertex.ingressEdges.delete(vertex);
          this.edges.delete(egressEdge);
        });

        vertex.ingressEdges.forEach((ingressEdge, connectedVertex) => {
          connectedVertex.egressEdges.delete(vertex);
          this.edges.delete(ingressEdge);
        });
      }
    });
  };

  // This function assumes the density is set to PPE with distinct operations
  // It is a class property so that it can be aware of density in late-alpha
  //
  // It might make sense to live on PathElem so that pathElems can be compared when checking how many
  // inbound/outbound edges are visible for a vertex, but maybe not as vertices could be densitiy-aware and
  // provide that to this fn. could also be property on pathElem that gets set by addPathElems
  // tl;dr may move in late-alpha
  private getVertexKey = (pathElem: PathElem): string => {
    const { memberIdx, memberOf } = pathElem;
    const { focalIdx, members } = memberOf;

    return members
      .slice(Math.min(focalIdx, memberIdx), Math.max(focalIdx, memberIdx) + 1)
      .map(({ operation }) => `${operation.service.name}\t${operation.name}`)
      .join('\n');
  };

  public getEdgesAndVertices = (visKey: string) => {
    const { added, removed } = compareKeys({
      newKey: visKey,
      oldKey: this.prevVisKey,
    });
    this.prevVisKey = visKey;
    this.removeElems(removed);
    this.addElems(added);
    return {
      edges: Array.from(this.edges),
      vertices: Array.from(this.vertices.values()),
    };
  };
}
