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

import { TVertex } from '@jaegertracing/plexus/lib/types';

import { DdgEdge, PathElem } from './types';

type TDdgVertex = {
  egressEdges: Map<DdgVertex, DdgEdge>;
  ingressEdges: Map<DdgVertex, DdgEdge>;
  pathElems: Set<PathElem>;
}

export default class DdgVertex implements TVertex<TDdgVertex> {
  egressEdges: Map<DdgVertex, DdgEdge>;
  key: string;
  ingressEdges: Map<DdgVertex, DdgEdge>;
  pathElems: Set<PathElem>;

  constructor({ key }: { key: string }) {
    this.egressEdges = new Map();
    this.key = key;
    this.ingressEdges = new Map();
    this.pathElems = new Set();
  }

  /*
  private toJSONHelper = () => ({
    key: this.key,
    pathElems: this.pathElems,
  });
   */

  toJSON() {
    type TDigestibleEdges = Record<string, DdgEdge>;
    // type TDigestibleEdges = Map<string, DdgEdge>;
    // type TDigestibleEdges = Map<{ key: string, pathElems: Set<PathElem> }, DdgEdge>;
    // type TDigestibleEdges = Map<ReturnType<this.toJSONHelper>, DdgEdge>;
    const digestibleEgressEdges: TDigestibleEdges = {};
    const digestibleIngressEdges: TDigestibleEdges = {};
    this.egressEdges.forEach((edge, egreesNeighbor) => {
      // digestibleEgressEdges.set(egreesNeighbor.toJSONHelper(), edge);
      // digestibleEgressEdges.set(egreesNeighbor.key, edge);
      digestibleEgressEdges[egreesNeighbor.key] = edge;
    });
    this.ingressEdges.forEach((edge, ingreesNeighbor) => {
      // digestibleIngressEdges.set(ingreesNeighbor.toJSONHelper(), edge);
      // digestibleIngressEdges.set(ingreesNeighbor.key, edge);
      digestibleIngressEdges[ingreesNeighbor.key] = edge;
    });
    return {
      egressEdges: digestibleEgressEdges,
      key: this.key,
      ingressEdges: digestibleIngressEdges,
      pathElems: this.pathElems,
    };
  };

  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  get [Symbol.toStringTag]() {
    return `DdgVertex ${this.key}`;
  }
}
