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
   * DdgVertex, some assistance is necessary when creating error messages. `toJSON` is called by
   * `JSON.stringify` and expected to return a JSON object. To that end, this method uses an array of vertex
   * keys to represent edges in place of circular references.
   */
  toJSON() {
    return {
      egressVertices: Array.from(this.egressEdges.keys()).map(({ key }) => key),
      key: this.key,
      ingressVertices: Array.from(this.egressEdges.keys()).map(({ key }) => key),
      pathElems: this.pathElems,
    };
  }

  // `toJSON` is called by `JSON.stringify` while `toString` is used by template strings and string concat
  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  // `[Symbol.toStringTag]` is used when attempting to use an object as a key on an object, where a full
  // stringified JSON would reduce clarity
  get [Symbol.toStringTag]() {
    return `DdgVertex ${this.key}`;
  }
}
