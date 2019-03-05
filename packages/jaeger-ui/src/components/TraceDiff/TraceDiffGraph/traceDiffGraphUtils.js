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

import _get from 'lodash/get';
import _map from 'lodash/map';

import convPlexus from '../../../model/trace-dag/convPlexus';
import TraceDag from '../../../model/trace-dag/TraceDag';
import filterSpans from '../../../utils/filter-spans';

import type { PVertex } from '../../../model/trace-dag/types';
import type { Trace } from '../../../types/trace';

export type vertexKeys = Set<number | string>;

let lastUiFind: string;
let lastVertices: PVertex<Trace>[];
let uiFindVertexKeys: ?vertexKeys;

export function getUiFindVertexKeys(uiFind: string, vertices: PVertex<Trace>[]): vertexKeys {
  if (uiFind === lastUiFind && vertices === lastVertices && uiFindVertexKeys) {
    return uiFindVertexKeys;
  }
  const newVertexKeys: Set<number | string> = new Set();
  vertices.forEach(({ key, data: { members } }) => {
    if (_get(filterSpans(uiFind, _map(members, 'span')), 'size')) {
      newVertexKeys.add(key);
    }
  });
  lastUiFind = uiFind;
  lastVertices = vertices;
  uiFindVertexKeys = newVertexKeys;
  return newVertexKeys;
}

let lastAData: ?Trace;
let lastBData: ?Trace;
let edgesAndVertices: ?Object;

export function getEdgesAndVertices(aData: Trace, bData: Trace) {
  if (aData === lastAData && bData === lastBData && edgesAndVertices) {
    return edgesAndVertices;
  }
  lastAData = aData;
  lastBData = bData;
  const aTraceDag = TraceDag.newFromTrace(aData);
  const bTraceDag = TraceDag.newFromTrace(bData);
  const diffDag = TraceDag.diff(aTraceDag, bTraceDag);
  edgesAndVertices = convPlexus(diffDag.nodesMap);
  return edgesAndVertices;
}
