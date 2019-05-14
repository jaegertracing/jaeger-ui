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

import _map from 'lodash/map';

import { compareVisibilityKeys, changeVisibility } from './visibility-key';

import { PathElem, TDdgEdge, /* TDdgVertex, */ DdgVertex, TDdgTransformedDdgData, TDdgPathElemsByDistance, TDdgPath, TDdgServiceMap } from './types';

export default class ddgEdgesAndVertices {
  lastVisibilityKey: string;
  pathElemsByDistance: TDdgPathElemsByDistance;
  pathElemToVertex: Map<PathElem, DdgVertex>;
  paths: TDdgPath[];
  services: TDdgServiceMap;
  // edges: TDdgEdge[];
  edges: Set<TDdgEdge>;
  vertices: Map<string, DdgVertex>;
  visibilityIdxToPathElem: Map<number, PathElem>;

  constructor({ ddgData, visibilityKey }: { ddgData: TDdgTransformedDdgData, visibilityKey?: string }) {
    this.pathElemsByDistance = ddgData.pathElemsByDistance;
    this.paths = ddgData.paths;
    this.services = ddgData.services;
    this.visibilityIdxToPathElem = ddgData.visibilityIdxToPathElem;
    this.pathElemToVertex = new Map();
    this.edges = new Set();
    this.vertices = new Map();

    let visibleIndices: number[];
    if (visibilityKey == null) {
      visibleIndices = _map(this.pathElemsByDistance.get(0), 'visibilityIdx');
      this.lastVisibilityKey = changeVisibility({
        visibilityKey: '',
        showIndices: visibleIndices,
      });
    } else {
      this.lastVisibilityKey = visibilityKey;
      visibleIndices = compareVisibilityKeys({ oldVisibilityKey: '', newVisibilityKey: visibilityKey }).added;
    }

    this.showPathElems(visibleIndices);
  }

  showPathElems = (newIndices: number[]) => {
    newIndices.forEach(newIdx => {
      const pathElem = this.visibilityIdxToPathElem.get(newIdx) as PathElem;
      const key = this.getVertexKey(pathElem);

      // This should always be truthy...
      if (!this.pathElemToVertex.has(pathElem)) {
        if (!this.vertices.has(key)) {
          const newVertex = new DdgVertex({ key });
          this.vertices.set(key, newVertex);
        }
        this.pathElemToVertex.set(pathElem, this.vertices.get(key) as DdgVertex);
      }
      const vertex = this.vertices.get(key) as DdgVertex;
      vertex.pathElems.add(pathElem);

      if (pathElem.distance) {
        const precursorPathElem = pathElem.memberOf.members[pathElem.memberOf.focalIdx + pathElem.distance - pathElem.distance / Math.abs(pathElem.distance)];
        const precursorVertex = this.pathElemToVertex.get(precursorPathElem) as DdgVertex;

        if (!vertex.ingressEdges.has(precursorVertex)) {
          const newEdge = {
            from: precursorVertex,
            to: vertex,
          };
          vertex.ingressEdges.set(precursorVertex, newEdge);
          precursorVertex.egressEdges.set(vertex, newEdge);
          this.edges.add(newEdge);
        }
      }
    });
  }

  // This function assumes the density is set to PPE with distinct operations
  getVertexKey = (pathElem: PathElem): string => {
    return pathElem.memberOf.members
      .slice(pathElem.memberOf.focalIdx + pathElem.distance, Math.abs(pathElem.distance))
      .map(({ operation: { name, service } }) => `service.name::name`).join('|');
  }
}
