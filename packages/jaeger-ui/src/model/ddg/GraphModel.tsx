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

import { TEdge } from '@jaegertracing/plexus/lib/types';

import { decode } from './visibility-codec';

import { PathElem, EDdgDensity, TDdgDistanceToPathElems, TDdgModel, TDdgVertex } from './types';

export default class GraphModel {
  private readonly density: EDdgDensity;
  private readonly distanceToPathElems: TDdgDistanceToPathElems;
  private readonly pathElemToEdge: Map<PathElem, TEdge>;
  private readonly pathElemToVertex: Map<PathElem, TDdgVertex>;
  private readonly showOp: boolean;
  private readonly vertexToPathElems: Map<TDdgVertex, Set<PathElem>>;
  private readonly vertices: Map<string, TDdgVertex>;
  private readonly visIdxToPathElem: PathElem[];

  constructor({ ddgModel, density, showOp }: { ddgModel: TDdgModel; density: EDdgDensity; showOp: boolean }) {
    this.density = density;
    this.distanceToPathElems = ddgModel.distanceToPathElems;
    this.pathElemToEdge = new Map();
    this.pathElemToVertex = new Map();
    this.showOp = showOp;
    this.vertexToPathElems = new Map();
    this.vertices = new Map();
    this.visIdxToPathElem = ddgModel.visIdxToPathElem;

    ddgModel.visIdxToPathElem.forEach(pathElem => {
      // If there is a compatible vertex for this pathElem, use it, else, make a new vertex
      const key = this.getVertexKey(pathElem);
      let vertex: TDdgVertex | undefined = this.vertices.get(key);
      if (!vertex) {
        const isFocalNode = !pathElem.distance;
        vertex = {
          key,
          isFocalNode,
          service: pathElem.operation.service.name,
          operation: this.showOp || isFocalNode ? pathElem.operation.name : null,
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
    const elemToStr = this.showOp
      ? ({ operation }: PathElem) => `${operation.service.name}----${operation.name}`
      : // Always show the operation for the focal node, i.e. when distance === 0
        ({ distance, operation }: PathElem) =>
          distance === 0 ? `${operation.service.name}----${operation.name}` : operation.service.name;

    switch (this.density) {
      case EDdgDensity.MostConcise: {
        return elemToStr(pathElem);
      }
      case EDdgDensity.UpstreamVsDownstream: {
        return `${elemToStr(pathElem)}=${Math.sign(pathElem.distance)}`;
      }
      case EDdgDensity.PreventPathEntanglement:
      case EDdgDensity.ExternalVsInternal: {
        const decorate =
          this.density === EDdgDensity.ExternalVsInternal
            ? (str: string) => `${str}${pathElem.isExternal ? '----external' : ''}`
            : (str: string) => str;
        const { memberIdx, memberOf } = pathElem;
        const { focalIdx, members } = memberOf;

        return decorate(
          members
            .slice(Math.min(focalIdx, memberIdx), Math.max(focalIdx, memberIdx) + 1)
            .map(elemToStr)
            .join('____')
        );
      }
      default: {
        throw new Error(
          `Density: ${this.density} has not been implemented, try one of these: ${JSON.stringify(
            EDdgDensity,
            null,
            2
          )}`
        );
      }
    }
  };

  public groupPathElemDataByVertexKey<T>(data: Map<number, T>): Map<string, T[]> {
    const rv = new Map<string, T[]>();
    data.forEach((value, key) => {
      const pe = this.visIdxToPathElem[key];
      if (!pe) {
        throw new Error(`Invalid vis ids: ${key}`);
      }
      const vertex = this.pathElemToVertex.get(pe);
      if (!vertex) {
        throw new Error(`Path elem without vertex: ${pe}`);
      }
      const current = rv.get(vertex.key);
      if (!current) {
        rv.set(vertex.key, [value]);
      } else {
        current.push(value);
      }
    });
    return rv;
  }

  public getPathElemsFromVertexKey(vertexKey: string): Set<PathElem> {
    const vertex = this.vertices.get(vertexKey);
    if (!vertex) {
      return new Set();
    }
    return this.vertexToPathElems.get(vertex) || new Set();
  }

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
        .trim()
        .toLowerCase()
        .split(' ');
      const { vertices } = this.getVisible(visEncoding);
      for (let i = 0; i < vertices.length; i++) {
        const { service, operation } = vertices[i];
        const svc = service.toLowerCase();
        const op = operation && operation.toLowerCase();
        for (let j = 0; j < uiFindArr.length; j++) {
          if (svc.includes(uiFindArr[j]) || (op && op.includes(uiFindArr[j]))) {
            vertexSet.add(vertices[i]);
            break;
          }
        }
      }

      return vertexSet;
    }
  );

  // eslint-disable-next-line consistent-return
  public getVisiblePathElems = (vertexKey: string, visEncoding?: string): PathElem[] | undefined => {
    const vertex = this.vertices.get(vertexKey);
    if (vertex) {
      const pathElems = this.vertexToPathElems.get(vertex);
      if (pathElems && pathElems.size) {
        const visIndices = visEncoding ? new Set(decode(visEncoding)) : undefined;
        return Array.from(pathElems).filter(elem => {
          return visIndices ? visIndices.has(elem.visibilityIdx) : Math.abs(elem.distance) < 3;
        });
      }
    }
  };
}

export const makeGraph = memoize(10)(
  (ddgModel: TDdgModel, showOp: boolean, density: EDdgDensity) =>
    new GraphModel({ ddgModel, density, showOp })
);
