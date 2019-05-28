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

import DdgVertex from './DdgVertex';
import { DdgEdge } from './types';

describe('DdgVertex', () => {
  function makeTestVertex(vertexKey) {
    const vertex = new DdgVertex({ key: vertexKey });
    vertex.pathElems.add(`${vertexKey}-pathElem0`);
    vertex.pathElems.add(`${vertexKey}-pathElem1`);
    return vertex;
  }

  function makeTestEdge(from, to) {
    const edge = new DdgEdge({ from, to });
    from.egressEdges.set(to, edge);
    to.ingressEdges.set(from, edge);
  }

  const twoHopUpstreamVertexKey = 'twoHopUpstreamVertexKey';
  const oneHopUpstreamVertexKey0 = 'oneHopUpstreamVertexKey0';
  const oneHopUpstreamVertexKey1 = 'oneHopUpstreamVertexKey1';
  const targetVertexKey = 'targetVertexKey';
  const siblingVertexKey = 'siblingVertexKey';
  const oneHopDownstreamVertexKey0 = 'oneHopDownstreamVertexKey0';
  const oneHopDownstreamVertexKey1 = 'oneHopDownstreamVertexKey1';
  const twoHopDownstreamVertexKey = 'twoHopDownstreamVertexKey';

  const twoHopUpstreamVertex = makeTestVertex(twoHopUpstreamVertexKey);
  const oneHopUpstreamVertex0 = makeTestVertex(oneHopUpstreamVertexKey0);
  const oneHopUpstreamVertex1 = makeTestVertex(oneHopUpstreamVertexKey1);
  const targetVertex = makeTestVertex(targetVertexKey);
  const siblingVertex = makeTestVertex(siblingVertexKey);
  const oneHopDownstreamVertex0 = makeTestVertex(oneHopDownstreamVertexKey0);
  const oneHopDownstreamVertex1 = makeTestVertex(oneHopDownstreamVertexKey1);
  const twoHopDownstreamVertex = makeTestVertex(twoHopDownstreamVertexKey);

  const twoHopToOneHop0UpstreamEdge = makeTestEdge(twoHopUpstreamVertex, oneHopUpstreamVertex0);
  const oneHop0ToTargetUpstreamEdge = makeTestEdge(oneHopUpstreamVertex0, targetVertex);
  const targetToOneHop0DownstreamEdge = makeTestEdge(targetVertex, oneHopDownstreamVertex0);
  const oneHop0ToTwoHopDownstreamEdge = makeTestEdge(oneHopDownstreamVertex0, twoHopDownstreamVertex);

  const oneHop1ToTargetUpstreamEdge = makeTestEdge(oneHopUpstreamVertex1, targetVertex);
  const targetToOneHop1DownstreamEdge = makeTestEdge(targetVertex, oneHopDownstreamVertex1);

  const oneHop1ToSiblingUpstreamEdge = makeTestEdge(oneHopUpstreamVertex1, siblingVertex);
  const siblingToOneHop1DownstreamEdge = makeTestEdge(siblingVertex, oneHopDownstreamVertex1);

  it('initializes', () => {
    const vertexKey = 'vertex-key';
    const testDdgVertex = new DdgVertex({ key: vertexKey });
    expect(testDdgVertex.egressEdges).toEqual(new Map());
    expect(testDdgVertex.key).toEqual(vertexKey);
    expect(testDdgVertex.ingressEdges).toEqual(new Map());
    expect(testDdgVertex.pathElems).toEqual(new Set());
  });

  /*
  it('creates partial JSON', () => {
    const partialJSON = targetVertex.toJSONHelper();
    expect(partialJSON).toEqual({
      key: targetVertexKey,
      pathElems: targetVertex.pathElems,
    });
  });
  */

  it('creates consumable JSON', () => {
    expect(targetVertex.toJSON()).toMatchSnapshot();
  });

  it('creates consumable string', () => {
    expect(targetVertex.toString()).toBe(JSON.stringify(targetVertex.toJSON(), null, 2));
  });

  it('creates informative string tag', () => {
    expect(Object.prototype.toString.call(targetVertex)).toEqual(`[object DdgVertex ${targetVertexKey}]`);
  });
});
