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

import * as testResources from './transformDdgData.test.resources';
import transformDdgData from './transformDdgData';
import DdgEdgesAndVertices from './ddgEdgesAndVertices';

describe('DdgEdgesAndVertices', () => {
  // TODO: define in line if not reused
  const simpleDdgModel = transformDdgData(
    [testResources.simplePath],
    testResources.focalPathElem
  );
  const simpleTestDdgEV = new DdgEdgesAndVertices({
    ddgModel: simpleDdgModel,
    // TODO: use 7 not 3
    // visibilityKey: '7',
    // visibilityKey: '5',
  });
  simpleTestDdgEV.getEdgesAndVertices('7');

  const simpleTestfocalPathElem = simpleTestDdgEV.pathElemsByDistance.get(0)[0];

  describe('getVertexKey', () => {
    const expectedKeyEntry = pathElem => `${pathElem.operation.service.name}::${pathElem.operation.name}`;
    const expectedFocalPathElemKey = expectedKeyEntry(simpleTestfocalPathElem);

    it('creates key for focal pathElem', () => {
      expect(simpleTestDdgEV.getVertexKey(simpleTestfocalPathElem)).toBe(expectedFocalPathElemKey);
    });

    it('creates key for downstream pathElem', () => {
      const targetPathElem = simpleTestDdgEV.pathElemsByDistance.get(-2)[0];
      const interimPathElem = simpleTestDdgEV.pathElemsByDistance.get(-1)[0];
      expect(simpleTestDdgEV.getVertexKey(targetPathElem)).toBe([
        expectedKeyEntry(targetPathElem),
        expectedKeyEntry(interimPathElem),
        expectedFocalPathElemKey,
      ].join('|'));
    });

    it('creates key for downstream pathElem', () => {
      const targetPathElem = simpleTestDdgEV.pathElemsByDistance.get(2)[0];
      const interimPathElem = simpleTestDdgEV.pathElemsByDistance.get(1)[0];
      expect(simpleTestDdgEV.getVertexKey(targetPathElem)).toBe([
        expectedFocalPathElemKey,
        expectedKeyEntry(interimPathElem),
        expectedKeyEntry(targetPathElem),
      ].join('|'));
    });
  });

  it('creates three vertices and two edges for one-path one-hop ddg', () => {
    expect(simpleTestDdgEV.vertices.size).toBe(3);
    expect(simpleTestDdgEV.edges.size).toBe(2);

    const downstreamPathElem = simpleTestDdgEV.pathElemsByDistance.get(-1)[0];
    const downstreamVertex = simpleTestDdgEV.pathElemToVertex.get(downstreamPathElem);
    const focalVertex = simpleTestDdgEV.pathElemToVertex.get(simpleTestfocalPathElem);
    const upstreamPathElem = simpleTestDdgEV.pathElemsByDistance.get(1)[0];
    const upstreamVertex = simpleTestDdgEV.pathElemToVertex.get(upstreamPathElem);

    expect(upstreamVertex).toBeDefined();
    expect(upstreamVertex.pathElems.size).toBe(1);
    expect(upstreamVertex.pathElems.has(upstreamPathElem)).toBe(true);
    expect(upstreamVertex.ingressEdges.size).toBe(1);
    expect(upstreamVertex.egressEdges.size).toBe(0);

    expect(focalVertex).toBeDefined();
    expect(focalVertex.pathElems.size).toBe(1);
    expect(focalVertex.pathElems.has(simpleTestfocalPathElem)).toBe(true);
    expect(focalVertex.ingressEdges.size).toBe(1);
    expect(focalVertex.egressEdges.size).toBe(1);

    expect(downstreamVertex).toBeDefined();
    expect(downstreamVertex.pathElems.size).toBe(1);
    expect(downstreamVertex.pathElems.has(downstreamPathElem)).toBe(true);
    expect(downstreamVertex.ingressEdges.size).toBe(0);
    expect(downstreamVertex.egressEdges.size).toBe(1);

    const ingressEdge = focalVertex.ingressEdges.get(downstreamVertex);
    const egressEdge = focalVertex.egressEdges.get(upstreamVertex);
    expect(ingressEdge.from).toBe(downstreamVertex);
    expect(ingressEdge.to).toBe(focalVertex);
    expect(ingressEdge).toBe(downstreamVertex.egressEdges.get(focalVertex));
    expect(egressEdge.from).toBe(focalVertex);
    expect(egressEdge.to).toBe(upstreamVertex);
    expect(egressEdge).toBe(upstreamVertex.ingressEdges.get(focalVertex));
  });

  it('removes vertex and edge', () => {
    simpleTestDdgEV.getEdgesAndVertices('5');
    expect(simpleTestDdgEV.vertices.size).toBe(2);
    expect(simpleTestDdgEV.edges.size).toBe(1);

    const downstreamPathElem = simpleTestDdgEV.pathElemsByDistance.get(-1)[0];
    const downstreamVertex = simpleTestDdgEV.pathElemToVertex.get(downstreamPathElem);
    const focalVertex = simpleTestDdgEV.pathElemToVertex.get(simpleTestfocalPathElem);
    const upstreamPathElem = simpleTestDdgEV.pathElemsByDistance.get(1)[0];
    const upstreamVertex = simpleTestDdgEV.pathElemToVertex.get(upstreamPathElem);

    expect(upstreamVertex).toBeUndefined();

    expect(focalVertex).toBeDefined();
    expect(focalVertex.pathElems.size).toBe(1);
    expect(focalVertex.pathElems.has(simpleTestfocalPathElem)).toBe(true);
    expect(focalVertex.ingressEdges.size).toBe(1);
    expect(focalVertex.egressEdges.size).toBe(0);

    expect(downstreamVertex).toBeDefined();
    expect(downstreamVertex.pathElems.size).toBe(1);
    expect(downstreamVertex.pathElems.has(downstreamPathElem)).toBe(true);
    expect(downstreamVertex.ingressEdges.size).toBe(0);
    expect(downstreamVertex.egressEdges.size).toBe(1);

    const edge = focalVertex.ingressEdges.get(downstreamVertex);
    expect(edge.from).toBe(downstreamVertex);
    expect(edge.to).toBe(focalVertex);
    expect(edge).toBe(downstreamVertex.egressEdges.get(focalVertex));
  });
});
