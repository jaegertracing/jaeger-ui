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

import memoize from 'lru-memoize';
import matchSorter from 'match-sorter';

import { TEdge } from '@jaegertracing/plexus/lib/types';

import { decode } from './visibility-codec';

import { PathElem, TDdgDistanceToPathElems, TDdgModel, TDdgVertex } from './types';

export default class Graph {
  private distanceToPathElems: TDdgDistanceToPathElems;
  private pathElemToEdge: Map<PathElem, TEdge>;
  private pathElemToVertex: Map<PathElem, TDdgVertex>;
  private vertexToPathElems: Map<TDdgVertex, Set<PathElem>>;
  private vertices: Map<string, TDdgVertex>;
  private visIdxToPathElem: PathElem[];

  constructor({ ddgModel }: { ddgModel: TDdgModel }) {
    this.distanceToPathElems = ddgModel.distanceToPathElems;
    this.pathElemToEdge = new Map();
    this.pathElemToVertex = new Map();
    this.vertexToPathElems = new Map();
    this.vertices = new Map();
    this.visIdxToPathElem = ddgModel.visIdxToPathElem;

    ddgModel.visIdxToPathElem.forEach(pathElem => {
      // If there is a compatible vertex for this pathElem, use it, else, make a new vertex
      const key = this.getVertexKey(pathElem);
      let vertex: TDdgVertex | undefined = this.vertices.get(key);
      if (!vertex) {
        vertex = {
          key,
          isFocalNode: !pathElem.distance,
          service: pathElem.operation.service.name,
          operation: pathElem.operation.name,
        };
        this.vertices.set(key, vertex);
        this.vertexToPathElems.set(vertex, new Set());
      }

      // Link pathElem to its vertex
      this.pathElemToVertex.set(pathElem, vertex);

      const pathElemsForVertex = this.vertexToPathElems.get(vertex);

      /* istanbul ignore next */
      if (!pathElemsForVertex) {
        throw new Error(`Vertex exists without pathElems, vertex: ${vertex}`);
      }

      // If the newly-visible PathElem is not the focalNode, it needs to be connected to the rest of the graph
      const connectedElem = pathElem.focalSideNeighbor;
      if (connectedElem) {
        const connectedVertex = this.pathElemToVertex.get(connectedElem);
        // If the connectedElem does not have a vertex, then the current pathElem cannot be connected to the
        // focalNode
        if (!connectedVertex) {
          throw new Error(`Non-focal pathElem cannot be connected to graph. PathElem: ${pathElem}`);
        }

        // Create edge connecting current vertex to connectedVertex
        const newEdge =
          pathElem.distance > 0
            ? {
                from: connectedVertex.key,
                to: vertex.key,
              }
            : {
                from: vertex.key,
                to: connectedVertex.key,
              };

        // Check if equivalent edge already exists
        let existingEdge: TEdge | undefined;
        const elemArr = Array.from(pathElemsForVertex);
        for (let i = 0; i < elemArr.length; i += 1) {
          const edge = this.pathElemToEdge.get(elemArr[i]);
          // With PPE as the only supported heuristic, the following two lines cannot be fully tested
          if (edge) {
            if (edge.to === newEdge.to && edge.from === newEdge.from) {
              existingEdge = edge;
              break;
            }
          }
        }

        // Prefer existing edge, else use new edge
        this.pathElemToEdge.set(pathElem, existingEdge || newEdge);
      }

      // Link vertex back to this pathElem
      pathElemsForVertex.add(pathElem);
    });
  }

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
      .map(({ operation }) => `${operation.service.name}----${operation.name}`)
      .join('____');
  };

  public getVisible: (visEncoding?: string) => { edges: TEdge[]; vertices: TDdgVertex[] } = memoize(10)(
    (visEncoding?: string): { edges: TEdge[]; vertices: TDdgVertex[] } => {
      const edges: Set<TEdge> = new Set();
      const vertices: Set<TDdgVertex> = new Set();
      const pathElems =
        visEncoding == null
          ? ([] as PathElem[]).concat(
              this.distanceToPathElems.get(-2) || [],
              this.distanceToPathElems.get(-1) || [],
              this.distanceToPathElems.get(0) || [],
              this.distanceToPathElems.get(1) || [],
              this.distanceToPathElems.get(2) || []
            )
          : decode(visEncoding)
              .map(visIdx => this.visIdxToPathElem[visIdx])
              .filter(Boolean);

      pathElems.forEach(pathElem => {
        const edge = this.pathElemToEdge.get(pathElem);
        if (edge) edges.add(edge);
        const vertex = this.pathElemToVertex.get(pathElem);
        if (vertex) vertices.add(vertex);
        else throw new Error(`PathElem wasn't present in initial model: ${pathElem}`);
      });

      return {
        edges: Array.from(edges),
        vertices: Array.from(vertices),
      };
    }
  );

  public getVisibleUiFindMatches: (uiFind?: string, visEncoding?: string) => Set<TDdgVertex> = memoize(10)(
    (uiFind?: string, visEncoding?: string): Set<TDdgVertex> => {
      const vertexSet: Set<TDdgVertex> = new Set();
      if (!uiFind) return vertexSet;

      const uiFindArr = uiFind
        .toLowerCase()
        .split(' ')
        .filter(Boolean);
      const { vertices } = this.getVisible(visEncoding);
      vertices.forEach(vertex => {
        const { service, operation } = vertex;
        const possibleMatch = `${service} ${operation}`.toLowerCase();
        if (uiFindArr.some(str => possibleMatch.includes(str))) {
          vertexSet.add(vertex);
        }
      });

      return vertexSet;
    }
  );
}

export const makeGraph = memoize(10)((ddgModel: TDdgModel) => new Graph({ ddgModel }));
