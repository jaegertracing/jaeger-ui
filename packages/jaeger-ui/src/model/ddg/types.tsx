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

import PathElem from './PathElem';

export { default as PathElem } from './PathElem';

export type TDdgPayloadEntry = {
  operation: string;
  service: string;
};

export type TDdgPayload = TDdgPayloadEntry[][];

export type TDdgService = {
  name: string;
  operations: Map<string, TDdgOperation>;
};

export type TDdgOperation = {
  name: string;
  pathElems: PathElem[];
  service: TDdgService;
};

export type TDdgPath = {
  // // that probably won't actually work
  // This could also be a class so that focalIdx can be a getter as it may change when (en|dis)abling
  // distinct operations
  focalIdx: number;
  members: PathElem[];
};

export type TDdgServiceMap = Map<string, TDdgService>;

export type TDdgPathElemsByDistance = Map<number, PathElem[]>;

export type TDdgVisibilityIdxToPathElem = Map<number, PathElem>;

export type TDdgModel = {
  pathElemsByDistance: TDdgPathElemsByDistance;
  paths: TDdgPath[];
  services: TDdgServiceMap;
  visibilityIdxToPathElem: TDdgVisibilityIdxToPathElem;
};

  /*
export type TDdgVertex = {
  egressEdges: TDdgEdge[];
  ingressEdges: TDdgEdge[];
  pathElems: PathElem[];
}
   */
export type TDdgEdgeIdentifiers = 'egressEdges' | 'ingressEdges';

export class DdgVertex {
  egressEdges: Map<DdgVertex, TDdgEdge>;
  key: string;
  ingressEdges: Map<DdgVertex, TDdgEdge>;
  // pathElems: PathElem[];
  pathElems: Set<PathElem>;

  constructor({ key }: { key: string }) {
    this.egressEdges = new Map();
    this.key = key;
    this.ingressEdges = new Map();
    this.pathElems = new Set();
  }
}

export type TDdgEdge = {
  from: DdgVertex;
  to: DdgVertex;
}
