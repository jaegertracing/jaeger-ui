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
  private edgeToFarSideOfEdgePathElems: Map<TEdge, Set<PathElem>>;
  private farSideOfEdgePathElemsToEdge: Map<Set<PathElem>, TEdge>;
  private prevVisKey: string;
  private pathElemToFarSideOfEdgePathElems: Map<PathElem, Set<PathElem>>;
  private pathElemToVertex: Map<PathElem, DdgVertex>;
  private vertices: Map<string, DdgVertex>;
  private visIdxToPathElem: PathElem[];

  constructor({ ddgModel }: { ddgModel: TDdgModel }) {
    this.edges = new Set();
    this.edgeToFarSideOfEdgePathElems = new Map();
    this.farSideOfEdgePathElemsToEdge = new Map();
    this.pathElemToFarSideOfEdgePathElems = new Map();
    this.pathElemToVertex = new Map();
    this.prevVisKey = '';
    this.vertices = new Map();
    this.visIdxToPathElem = ddgModel.visIdxToPathElem;
  }

  private showElems = (showIndices: number[]) => {
    showIndices.forEach(showIdx => {
      // If there is a compatible vertex for this visIdx, use it, else, make a new vertex
      const pathElem = this.visIdxToPathElem[showIdx];
      if (!pathElem) {
        throw new Error(`Given visibilityIdx that does not exist: ${showIdx}`);
      }

      const key = this.getVertexKey(pathElem);
      let vertex = this.vertices.get(key);
      if (!vertex) {
        vertex = new DdgVertex({ key });
        this.vertices.set(key, vertex);
      }

      // Create bi-directional links between the vertex and its PathElems
      this.pathElemToVertex.set(pathElem, vertex);
      vertex.pathElems.add(pathElem);

      // If the newly-visible PathElem is not the focalNode, it needs to be connected to the rest of the graph
      const connectedElem = pathElem.focalSideNeighbor;
      if (connectedElem) {
        const connectedVertex = this.pathElemToVertex.get(connectedElem);
        // If the connectedElem does not have a vertex, then the current pathElem cannot be connected to the
        // focalNode
        if (!connectedVertex) {
          throw new Error(`Non-focal pathElem cannot be connected to graph. PathElem: ${pathElem}`);
        }

        const edge = vertex[pathElem.focalSideEdgesKey].get(connectedVertex);
        // If the pathElem is not already connected to its connectedElem (through previously-processed
        // pathElems that share the same edge) create a new edge
        if (!edge) {
          const newEdge =
            pathElem.focalSideEdgesKey === EDdgEdgeKeys.ingressEdges
              ? {
                  from: connectedVertex.key,
                  to: vertex.key,
                }
              : {
                  from: vertex.key,
                  to: connectedVertex.key,
                };

          // Add the new edge to the DdgEVManager instance to be returned and rendered later
          this.edges.add(newEdge);

          // Each endpoint of this new edge should be aware of the other endpoint of the edge
          // `Map<vertex, edge>`s are used in place of `Set<vertex>`s so that the edge can be accessed later
          // in the event of multiple pathElems being associated with the same edge
          vertex[pathElem.focalSideEdgesKey].set(connectedVertex, newEdge);
          connectedVertex[pathElem.farSideEdgesKey].set(vertex, newEdge);

          // The pathElem needs to be associated with the new edge so that edges can be removed when hiding
          // pathElems even if no vertices are removed, which is possible with certain density settings
          const farSideOfEdgePathElems = new Set([pathElem]);
          this.edgeToFarSideOfEdgePathElems.set(newEdge, farSideOfEdgePathElems);
          this.farSideOfEdgePathElemsToEdge.set(farSideOfEdgePathElems, newEdge);
          this.pathElemToFarSideOfEdgePathElems.set(pathElem, farSideOfEdgePathElems);

          // Else the pathElem is already connected to its connectedElem (through previously-processed
          // pathElems that share the same edge), and that existing edge needs to be associated with this
          // newly-visible pathElem
        } else {
          const elems = this.edgeToFarSideOfEdgePathElems.get(edge);
          // If the edge is pre-existing but absent from this map, it must have been erroneously removed
          if (!elems) {
            throw new Error(`Existing edge not associated with any pathElems: ${edge}`);
          }

          // If the edge was not removed when its last pathElem was hidden, something went wrong
          if (!elems.size) {
            throw new Error(`Edge was not removed when its last pathElem was hidden: ${edge}`);
          }

          // The pathElem needs to be associated with the pre-existing edge so that edges can be removed when
          // hiding pathElems even if no vertices are removed, which is possible with certain density settings
          elems.add(pathElem);
          this.pathElemToFarSideOfEdgePathElems.set(pathElem, elems);
        }
      }
    });
  };

  private hideElems = (hideIndices: number[]) => {
    hideIndices.forEach(hideIdx => {
      // Find the corresponding pathElem and vertex for this visIdx
      const pathElem = this.visIdxToPathElem[hideIdx];
      if (!pathElem) {
        throw new Error(`Given visibilityIdx that does not exist: ${hideIdx}`);
      }
      const key = this.getVertexKey(pathElem);
      const vertex = this.vertices.get(key);
      if (!vertex) {
        throw new Error(`Attempting to hide PathElem without vertex: ${pathElem}`);
      }

      // Remove the bi-directional links between the vertex and the now-hidden PathElem
      this.pathElemToVertex.delete(pathElem);
      vertex.pathElems.delete(pathElem);

      // If this pathElem is not a focalNode pathElem an edge may need to be removed
      const elems = this.pathElemToFarSideOfEdgePathElems.get(pathElem);
      if (elems) {
        this.pathElemToFarSideOfEdgePathElems.delete(pathElem);
        elems.delete(pathElem);

        // If the last pathElem for an edge is hidden, the edge needs to be removed
        if (!elems.size) {
          const edge = this.farSideOfEdgePathElemsToEdge.get(elems);
          // If the edge was removed before the last pathElem dependent on it was hidden, something went wrong
          if (!edge) {
            throw new Error(`Non-focal node was not connected to graph: ${vertex}`);
          }

          const connectedElem = pathElem.focalSideNeighbor;
          // Only non-focalNode pathElems should be farSideOfEdgePathElems, but only focalNode pathElems lack
          // a focalSideNeighbor
          if (!connectedElem) {
            throw new Error(`Focal node had malformed edge: ${JSON.stringify({ edge, pathElem }, null, 2)}`);
          }

          const connectedVertex = this.pathElemToVertex.get(connectedElem);
          // If the connectedElem does not have a vertex, then the current pathElem could not have been
          // connected to the focalNode
          if (!connectedVertex) {
            throw new Error(`Non-focal node was not connected to graph: ${vertex}`);
          }

          // If nothing went wrong, remove the connection between the two vertices...
          connectedVertex[pathElem.farSideEdgesKey].delete(vertex);
          vertex[pathElem.focalSideEdgesKey].delete(connectedVertex);
          this.edges.delete(edge);

          // ...and remove the metadata
          this.farSideOfEdgePathElemsToEdge.delete(elems);
          this.edgeToFarSideOfEdgePathElems.delete(edge);
        }

        // If this pathElem has a truthy distance then it is a non-focalNode and if it was not present in
        // this.pathElemToFarSideOfEdgePathElems then it could not have been connected to the graph or it was
        // erroneously removed from this.pathElemToFarSideOfEdgePathElems.
      } else if (pathElem.distance) {
        throw new Error(`Non-focal node was not connected to graph: ${vertex}`);
      }

      // If the last visibile PathElem for this vertex is now hidden, ensure edges have been cleaned up
      // correctly and remove the vertex
      if (vertex.pathElems.size === 0) {
        if (vertex[pathElem.farSideEdgesKey].size || vertex[pathElem.farSideEdgesKey].size) {
          throw new Error(`Attempting to hide vertex that other vertices are connected to: ${vertex}`);
        }
        this.vertices.delete(key);
      }
    });
  };

  // This function assumes the density is set to PPE with distinct operations
  // It is a class property so that it can be aware of density in late-alpha
  //
  // It might make sense to live on PathElem so that pathElems can be compared when checking how many
  // inbound/outbound edges are visible for a vertex, but maybe not as vertices could be densitiy-aware and
  // provide that to this fn. could also be property on pathElem that gets set by showElems
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
    // shown indices are increasing order, hidden are in decreasing order - this ensures that graph remains
    // valid and rational while iterating through the indices
    const { shown, hidden } = compareKeys({
      newKey: visKey,
      oldKey: this.prevVisKey,
    });
    this.prevVisKey = visKey;
    this.hideElems(hidden);
    this.showElems(shown);
    return {
      edges: Array.from(this.edges),
      vertices: Array.from(this.vertices.values()),
    };
  };
}
