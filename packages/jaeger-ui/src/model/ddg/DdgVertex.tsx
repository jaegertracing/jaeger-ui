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

import { TVertex, TEdge } from '@jaegertracing/plexus/lib/types';

import { PathElem } from './types';

type TDdgVertex = TVertex<{
  egressEdges: Map<DdgVertex, TEdge>;
  ingressEdges: Map<DdgVertex, TEdge>;
  pathElems: Set<PathElem>;
}>;

type TDigestibleEdges = Record<string, TEdge>;

export default class DdgVertex implements TDdgVertex {
  egressEdges: Map<DdgVertex, TEdge>;
  key: string;
  ingressEdges: Map<DdgVertex, TEdge>;
  pathElems: Set<PathElem>;

  constructor({ key }: { key: string }) {
    this.egressEdges = new Map();
    this.key = key;
    this.ingressEdges = new Map();
    this.pathElems = new Set();
  }

  /* 
   * Because the edges on a given DdgVertex reference other DdgVertices which in turn reference the initial
   * DdgVertex, some assistance is necessary when creating error messages. toJSON is called by JSON.stringify
   * and expected to return a JSON object. To that end, this method uses string keys instead of circular refs.
   */
  toJSON() {
    const digestibleEgressEdges: TDigestibleEdges = {};
    const digestibleIngressEdges: TDigestibleEdges = {};
    this.egressEdges.forEach((edge, egressNeighbor) => {
      digestibleEgressEdges[egressNeighbor[Symbol.toStringTag]] = edge;
    });
    this.ingressEdges.forEach((edge, ingressNeighbor) => {
      digestibleIngressEdges[ingressNeighbor[Symbol.toStringTag]] = edge;
    });
    return {
      egressEdges: digestibleEgressEdges,
      key: this.key,
      ingressEdges: digestibleIngressEdges,
      pathElems: this.pathElems,
    };
  }

  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  get [Symbol.toStringTag]() {
    return `DdgVertex ${this.key}`;
  }
}
