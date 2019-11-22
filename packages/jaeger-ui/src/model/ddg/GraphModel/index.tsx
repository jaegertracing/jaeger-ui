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

import getDerivedViewModifiers from './getDerivedViewModifiers';
import getEdgeId from './getEdgeId';
import getPathElemHasher, { FOCAL_KEY } from './getPathElemHasher';
import { decode, encode } from '../visibility-codec';

import {
  PathElem,
  ECheckedStatus,
  EDdgDensity,
  EDirection,
  TDdgDistanceToPathElems,
  TDdgModel,
  TDdgVertex,
} from '../types';

export { default as getEdgeId } from './getEdgeId';

export default class GraphModel {
  readonly getDerivedViewModifiers = memoize(3)(getDerivedViewModifiers.bind(this));
  private readonly getPathElemHasher = getPathElemHasher;
  readonly density: EDdgDensity;
  readonly distanceToPathElems: TDdgDistanceToPathElems;
  readonly pathElemToEdge: Map<PathElem, TEdge>;
  readonly pathElemToVertex: Map<PathElem, TDdgVertex>;
  readonly showOp: boolean;
  readonly vertexToPathElems: Map<TDdgVertex, Set<PathElem>>;
  readonly vertices: Map<string, TDdgVertex>;
  readonly visIdxToPathElem: PathElem[];

  constructor({ ddgModel, density, showOp }: { ddgModel: TDdgModel; density: EDdgDensity; showOp: boolean }) {
    this.density = density;
    this.distanceToPathElems = new Map(ddgModel.distanceToPathElems);
    this.pathElemToEdge = new Map();
    this.pathElemToVertex = new Map();
    this.showOp = showOp;
    this.vertexToPathElems = new Map();
    this.vertices = new Map();
    this.visIdxToPathElem = ddgModel.visIdxToPathElem.slice();

    const focalOperations: Set<string> = new Set();
    const hasher = this.getPathElemHasher();
    const edgesById = new Map<string, TEdge>();

    this.visIdxToPathElem.forEach(pathElem => {
      // If there is a compatible vertex for this pathElem, use it, else, make a new vertex
      const key = hasher(pathElem);
      const isFocalNode = !pathElem.distance;
      const operation = this.showOp ? pathElem.operation.name : null;
      if (isFocalNode && operation) focalOperations.add(operation);

      let vertex: TDdgVertex | undefined = this.vertices.get(key);
      if (!vertex) {
        vertex = {
          key,
          isFocalNode,
          service: pathElem.operation.service.name,
          operation,
        };
        this.vertices.set(key, vertex);
        this.vertexToPathElems.set(vertex, new Set([pathElem]));
      } else {
        const pathElemsForVertex = this.vertexToPathElems.get(vertex);
        /* istanbul ignore next */
        if (!pathElemsForVertex) {
          throw new Error(`Vertex exists without pathElems, vertex: ${vertex}`);
        }
        // Link vertex back to this pathElem
        pathElemsForVertex.add(pathElem);
      }
      // Link pathElem to its vertex
      this.pathElemToVertex.set(pathElem, vertex);

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
        const from = pathElem.distance > 0 ? connectedVertex.key : vertex.key;
        const to = pathElem.distance > 0 ? vertex.key : connectedVertex.key;
        const edgeId = getEdgeId(from, to);
        let edge = edgesById.get(edgeId);
        if (!edge) {
          edge = { from, to };
          edgesById.set(edgeId, edge);
        }
        this.pathElemToEdge.set(pathElem, edge);
      }
    });

    if (focalOperations.size > 1) {
      const focalVertex = this.vertices.get(FOCAL_KEY);
      // istanbul ignore next : focalVertex cannot be missing if focalOperations.size is not 0
      if (focalVertex) focalVertex.operation = Array.from(focalOperations);
    }

    Object.freeze(this.distanceToPathElems);
    Object.freeze(this.pathElemToEdge);
    Object.freeze(this.pathElemToVertex);
    Object.freeze(this.vertexToPathElems);
    Object.freeze(this.vertices);
    Object.freeze(this.visIdxToPathElem);
  }

  private getDefaultVisiblePathElems() {
    return ([] as PathElem[]).concat(
      this.distanceToPathElems.get(-2) || [],
      this.distanceToPathElems.get(-1) || [],
      this.distanceToPathElems.get(0) || [],
      this.distanceToPathElems.get(1) || [],
      this.distanceToPathElems.get(2) || []
    );
  }

  private getGeneration = (vertexKey: string, direction: EDirection, visEncoding?: string): PathElem[] => {
    const rv: PathElem[] = [];
    const elems = this.getVertexVisiblePathElems(vertexKey, visEncoding);
    if (!elems) return rv;

    elems.forEach(({ focalSideNeighbor, memberIdx, memberOf }) => {
      const generationMember = memberOf.members[memberIdx + direction];
      if (generationMember && generationMember !== focalSideNeighbor) rv.push(generationMember);
    });
    return rv;
  };

  public getGenerationVisibility = (
    vertexKey: string,
    direction: EDirection,
    visEncoding?: string
  ): ECheckedStatus | null => {
    const generation = this.getGeneration(vertexKey, direction, visEncoding);
    if (!generation.length) return null;

    const visibleIndices = this.getVisibleIndices(visEncoding);
    const visibleGeneration = generation.filter(({ visibilityIdx }) => visibleIndices.has(visibilityIdx));

    if (visibleGeneration.length === generation.length) return ECheckedStatus.Full;
    if (visibleGeneration.length) return ECheckedStatus.Partial;
    return ECheckedStatus.Empty;
  };

  private getVisiblePathElems(visEncoding?: string) {
    if (visEncoding == null) return this.getDefaultVisiblePathElems();
    return decode(visEncoding)
      .map(visIdx => this.visIdxToPathElem[visIdx])
      .filter(Boolean);
  }

  public getVisibleIndices(visEncoding?: string): Set<number> {
    return new Set(this.getVisiblePathElems(visEncoding).map(({ visibilityIdx }) => visibilityIdx));
  }

  public getVisible: (visEncoding?: string) => { edges: TEdge[]; vertices: TDdgVertex[] } = memoize(10)(
    (visEncoding?: string): { edges: TEdge[]; vertices: TDdgVertex[] } => {
      const edges: Set<TEdge> = new Set();
      const vertices: Set<TDdgVertex> = new Set();
      const pathElems = this.getVisiblePathElems(visEncoding);
      pathElems.forEach(pathElem => {
        const edge = this.pathElemToEdge.get(pathElem);
        if (edge) edges.add(edge);
        const vertex = this.pathElemToVertex.get(pathElem);
        if (vertex && !vertex.isFocalNode) vertices.add(vertex);
      });

      if (this.visIdxToPathElem.length) {
        const focalVertex = this.vertices.get(FOCAL_KEY);
        // istanbul ignore next : If there are pathElems without a focal vertex the constructor would throw
        if (!focalVertex) throw new Error('No focal vertex found');
        const visibleFocalElems = this.getVertexVisiblePathElems(FOCAL_KEY, visEncoding);
        if (visibleFocalElems && visibleFocalElems.length) {
          if (!this.showOp) vertices.add(focalVertex);
          else {
            const visibleFocalOps = Array.from(
              new Set(visibleFocalElems.map(({ operation }) => operation.name))
            );
            const potentiallyPartialFocalVertex = {
              ...focalVertex,
              operation: visibleFocalOps.length === 1 ? visibleFocalOps[0] : visibleFocalOps,
            };
            vertices.add(potentiallyPartialFocalVertex);
          }
        }
      }

      return {
        edges: Array.from(edges),
        vertices: Array.from(vertices),
      };
    }
  );

  private static getUiFindMatches(vertices: TDdgVertex[], uiFind?: string): Set<string> {
    const keySet: Set<string> = new Set();
    if (!uiFind || /^\s+$/.test(uiFind)) return keySet;

    const uiFindArr = uiFind
      .trim()
      .toLowerCase()
      .split(/\s+/);
    for (let i = 0; i < vertices.length; i++) {
      const { service, operation } = vertices[i];
      const svc = service.toLowerCase();
      const ops =
        operation && (Array.isArray(operation) ? operation : [operation]).map(op => op.toLowerCase());
      for (let j = 0; j < uiFindArr.length; j++) {
        if (svc.includes(uiFindArr[j]) || (ops && ops.some(op => op.includes(uiFindArr[j])))) {
          keySet.add(vertices[i].key);
          break;
        }
      }
    }

    return keySet;
  }

  public getHiddenUiFindMatches: (uiFind?: string, visEncoding?: string) => Set<string> = memoize(10)(
    (uiFind?: string, visEncoding?: string): Set<string> => {
      const visible = new Set(this.getVisible(visEncoding).vertices);
      const hidden: TDdgVertex[] = Array.from(this.vertices.values()).filter(
        vertex => !visible.has(vertex) && !vertex.isFocalNode
      );

      if (this.visIdxToPathElem.length) {
        const focalVertex = this.vertices.get(FOCAL_KEY);
        // istanbul ignore next : If there are pathElems without a focal vertex the constructor would throw
        if (!focalVertex) throw new Error('No focal vertex found');
        const focalElems = this.vertexToPathElems.get(focalVertex);
        // istanbul ignore next : If there are pathElems without a focal vertex the constructor would throw
        if (!focalElems) throw new Error('No focal elems found');
        const visibleFocalElems = new Set(this.getVertexVisiblePathElems(FOCAL_KEY, visEncoding));
        const hiddenFocalOperations = Array.from(focalElems)
          .filter(elem => !visibleFocalElems.has(elem))
          .map(({ operation }) => operation.name);
        if (hiddenFocalOperations.length) {
          hidden.push({
            ...focalVertex,
            operation: hiddenFocalOperations,
          });
        }
      }

      return GraphModel.getUiFindMatches(hidden, uiFind);
    }
  );

  public getVisibleUiFindMatches: (uiFind?: string, visEncoding?: string) => Set<string> = memoize(10)(
    (uiFind?: string, visEncoding?: string): Set<string> => {
      const { vertices } = this.getVisible(visEncoding);
      return GraphModel.getUiFindMatches(vertices, uiFind);
    }
  );

  private getVisWithoutElems(elems: PathElem[], visEncoding?: string) {
    const visible = this.getVisibleIndices(visEncoding);
    elems.forEach(({ externalPath }) => {
      externalPath.forEach(({ visibilityIdx }) => {
        visible.delete(visibilityIdx);
      });
    });

    return encode(Array.from(visible));
  }

  public getVisWithoutVertex(vertexKey: string, visEncoding?: string): string | undefined {
    const elems = this.getVertexVisiblePathElems(vertexKey, visEncoding);
    if (elems && elems.length) return this.getVisWithoutElems(elems, visEncoding);
    return undefined;
  }

  private getVisWithElems(elems: PathElem[], visEncoding?: string) {
    const visible = this.getVisibleIndices(visEncoding);
    elems.forEach(({ focalPath }) =>
      focalPath.forEach(({ visibilityIdx }) => {
        visible.add(visibilityIdx);
      })
    );

    return encode(Array.from(visible));
  }

  public getVisWithUpdatedGeneration(
    vertexKey: string,
    direction: EDirection,
    visEncoding?: string
  ): { visEncoding: string; update: ECheckedStatus } | null {
    const generationElems = this.getGeneration(vertexKey, direction, visEncoding);
    const currCheckedStatus = this.getGenerationVisibility(vertexKey, direction, visEncoding);
    if (!generationElems.length || !currCheckedStatus) return null;

    if (currCheckedStatus === ECheckedStatus.Full) {
      return {
        visEncoding: this.getVisWithoutElems(generationElems, visEncoding),
        update: ECheckedStatus.Empty,
      };
    }

    return {
      visEncoding: this.getVisWithElems(generationElems, visEncoding),
      update: ECheckedStatus.Full,
    };
  }

  public getVisWithVertices(vertexKeys: string[], visEncoding?: string) {
    const elemSet: PathElem[] = [];
    vertexKeys.forEach(vertexKey => {
      const vertex = this.vertices.get(vertexKey);
      if (!vertex) throw new Error(`${vertexKey} does not exist in graph`);
      const elems = this.vertexToPathElems.get(vertex);
      // istanbul ignore next : If a vertex exists it must have elems
      if (!elems) throw new Error(`${vertexKey} does not exist in graph`);

      elemSet.push(...elems);
    });

    return this.getVisWithElems(elemSet, visEncoding);
  }

  public getVertexVisiblePathElems(
    vertexKey: string,
    visEncoding: string | undefined
  ): PathElem[] | undefined {
    const vertex = this.vertices.get(vertexKey);
    if (vertex) {
      const pathElems = this.vertexToPathElems.get(vertex);
      if (pathElems && pathElems.size) {
        const visIndices = this.getVisibleIndices(visEncoding);
        return Array.from(pathElems).filter(elem => {
          return visIndices.has(elem.visibilityIdx);
        });
      }
    }
    return undefined;
  }
}

export const makeGraph = memoize(10)(
  (ddgModel: TDdgModel, showOp: boolean, density: EDdgDensity) =>
    new GraphModel({ ddgModel, density, showOp })
);
