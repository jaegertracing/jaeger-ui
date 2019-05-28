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

import * as testResources from './sample-paths.test.resources';
import transformDdgData from './transformDdgData';
import { changeVisibility, createVisibilityKey } from './visibility-key';

import DdgEVManager from './DdgEVManager';

describe('DdgEVManager', () => {
  function validateDdgEV(ddgEV, expectedVertices) {
    let expectedEdgeCount = 0;
    expectedVertices.forEach(
      ({
        visibilityIndices,
        ingressNeighborVisibilityIndices = [],
        egressNeighborVisibilityIndices = [],
      }) => {
        const pathElems = visibilityIndices.map(visibilityIdx =>
          ddgEV.visibilityIdxToPathElem.get(visibilityIdx)
        );
        const vertex = ddgEV.pathElemToVertex.get(pathElems[0]);
        expect(vertex.pathElems).toEqual(new Set(pathElems));

        expectedEdgeCount += ingressNeighborVisibilityIndices.length;
        ingressNeighborVisibilityIndices.forEach(ingressNeighborVisibilityIdx => {
          const ingressNeighbor = ddgEV.pathElemToVertex.get(
            ddgEV.visibilityIdxToPathElem.get(ingressNeighborVisibilityIdx)
          );
          const edge = vertex.ingressEdges.get(ingressNeighbor);
          expect(edge).toBeDefined();
          expect(ingressNeighbor.egressEdges.get(vertex)).toBe(edge);
          expect(edge.to).toBe(vertex.key);
          // expect(edge.data.to).toBe(vertex);
          expect(edge.from).toBe(ingressNeighbor.key);
          // expect(edge.data.from).toBe(ingressNeighbor);
        });

        expectedEdgeCount += egressNeighborVisibilityIndices.length;
        egressNeighborVisibilityIndices.forEach(egressNeighborVisibilityIdx => {
          const egressNeighbor = ddgEV.pathElemToVertex.get(
            ddgEV.visibilityIdxToPathElem.get(egressNeighborVisibilityIdx)
          );
          const edge = vertex.egressEdges.get(egressNeighbor);
          expect(edge).toBeDefined();
          expect(egressNeighbor.ingressEdges.get(vertex)).toBe(edge);
          expect(edge.to).toBe(egressNeighbor.key);
          // expect(edge.data.to).toBe(egressNeighbor);
          expect(edge.from).toBe(vertex.key);
          // expect(edge.data.from).toBe(vertex);
        });
      }
    );

    expect(ddgEV.vertices.size).toBe(expectedVertices.length);
    expect(ddgEV.edges.size).toBe(expectedEdgeCount / 2);
  }

  const simpleDdgModel = transformDdgData([testResources.simplePath], testResources.focalPayloadElem);

  describe('getVertexKey', () => {
    const simpleTestFocalPathElem = simpleDdgModel.paths[0].members[2];
    const expectedKeyEntry = pathElem => `${pathElem.operation.service.name}::${pathElem.operation.name}`;
    const expectedFocalPathElemKey = expectedKeyEntry(simpleTestFocalPathElem);
    const emptyDdgEdgesAndVertices = new DdgEVManager({ ddgModel: {} });

    it('creates key for focal pathElem', () => {
      expect(emptyDdgEdgesAndVertices.getVertexKey(simpleTestFocalPathElem)).toBe(expectedFocalPathElemKey);
    });

    it('creates key for downstream pathElem', () => {
      const targetPathElem = simpleDdgModel.paths[0].members[0];
      const interimPathElem = simpleDdgModel.paths[0].members[1];
      expect(emptyDdgEdgesAndVertices.getVertexKey(targetPathElem)).toBe(
        [expectedKeyEntry(targetPathElem), expectedKeyEntry(interimPathElem), expectedFocalPathElemKey].join(
          '|'
        )
      );
    });

    it('creates key for downstream pathElem', () => {
      const targetPathElem = simpleDdgModel.paths[0].members[4];
      const interimPathElem = simpleDdgModel.paths[0].members[3];
      expect(emptyDdgEdgesAndVertices.getVertexKey(targetPathElem)).toBe(
        [expectedFocalPathElemKey, expectedKeyEntry(interimPathElem), expectedKeyEntry(targetPathElem)].join(
          '|'
        )
      );
    });
  });

  describe('simple one-path one-hop ddg', () => {
    let simpleTestDdgEV;
    const oneHopVisibilityKey = createVisibilityKey([0, 1, 2]);

    beforeEach(() => {
      simpleTestDdgEV = new DdgEVManager({
        ddgModel: simpleDdgModel,
      });
      simpleTestDdgEV.getEdgesAndVertices(oneHopVisibilityKey);
    });

    it('creates three vertices and two edges for one-path one-hop ddg', () => {
      validateDdgEV(simpleTestDdgEV, [
        {
          visibilityIndices: [0],
          ingressNeighborVisibilityIndices: [2],
          egressNeighborVisibilityIndices: [1],
        },
        {
          visibilityIndices: [1],
          ingressNeighborVisibilityIndices: [0],
        },
        {
          visibilityIndices: [2],
          egressNeighborVisibilityIndices: [0],
        },
      ]);
    });

    it('removes vertex and edge', () => {
      simpleTestDdgEV.getEdgesAndVertices(
        changeVisibility({ visibilityKey: oneHopVisibilityKey, hideIndices: [1] })
      );

      validateDdgEV(simpleTestDdgEV, [
        {
          visibilityIndices: [0],
          ingressNeighborVisibilityIndices: [2],
        },
        {
          visibilityIndices: [2],
          egressNeighborVisibilityIndices: [0],
        },
      ]);
    });
  });

  describe('convergent paths', () => {
    const oneHopVisibilityKey = createVisibilityKey([0, 1, 2, 3, 4, 5]);
    const fullVisibilityKey = changeVisibility({
      visibilityKey: oneHopVisibilityKey,
      showIndices: [6, 7, 8, 9],
    });
    const downstreamAndFocalValidationParams = [
      {
        visibilityIndices: [0, 1],
        egressNeighborVisibilityIndices: [2, 3],
        ingressNeighborVisibilityIndices: [4],
      },
      {
        visibilityIndices: [4, 5],
        egressNeighborVisibilityIndices: [0],
      },
    ];
    let convergentDdgEV;

    beforeEach(() => {
      const convergentDdgModel = transformDdgData(testResources.convergentPaths, testResources.focalPayloadElem);
      convergentDdgEV = new DdgEVManager({
        ddgModel: convergentDdgModel,
      });
      convergentDdgEV.getEdgesAndVertices(oneHopVisibilityKey);
    });

    it('creates 3 edges and 4 vertices for initial hop', () => {
      validateDdgEV(convergentDdgEV, [
        ...downstreamAndFocalValidationParams,
        {
          visibilityIndices: [2],
          ingressNeighborVisibilityIndices: [0],
        },
        {
          visibilityIndices: [3],
          ingressNeighborVisibilityIndices: [0],
        },
      ]);
    });

    it('adds separate vertices for equal PathElems that have different focalSideNeighbors', () => {
      convergentDdgEV.getEdgesAndVertices(
        changeVisibility({ visibilityKey: oneHopVisibilityKey, showIndices: [6, 7] })
      );
      validateDdgEV(convergentDdgEV, [
        ...downstreamAndFocalValidationParams,
        {
          visibilityIndices: [2],
          egressNeighborVisibilityIndices: [6],
          ingressNeighborVisibilityIndices: [0],
        },
        {
          visibilityIndices: [6],
          ingressNeighborVisibilityIndices: [2],
        },
        {
          visibilityIndices: [3],
          egressNeighborVisibilityIndices: [7],
          ingressNeighborVisibilityIndices: [0],
        },
        {
          visibilityIndices: [7],
          ingressNeighborVisibilityIndices: [3],
        },
      ]);
    });

    it('adds separate vertices for equal PathElems that have different focalSideNeighbors', () => {
      convergentDdgEV.getEdgesAndVertices(fullVisibilityKey);
      validateDdgEV(convergentDdgEV, [
        ...downstreamAndFocalValidationParams,
        {
          visibilityIndices: [2],
          egressNeighborVisibilityIndices: [6],
          ingressNeighborVisibilityIndices: [0],
        },
        {
          visibilityIndices: [6],
          egressNeighborVisibilityIndices: [8],
          ingressNeighborVisibilityIndices: [2],
        },
        {
          visibilityIndices: [8],
          ingressNeighborVisibilityIndices: [6],
        },
        {
          visibilityIndices: [3],
          egressNeighborVisibilityIndices: [7],
          ingressNeighborVisibilityIndices: [0],
        },
        {
          visibilityIndices: [7],
          egressNeighborVisibilityIndices: [9],
          ingressNeighborVisibilityIndices: [3],
        },
        {
          visibilityIndices: [9],
          ingressNeighborVisibilityIndices: [7],
        },
      ]);
    });

    it('removes pathElems without removing other pahtElems with same service & operation', () => {
      convergentDdgEV.getEdgesAndVertices(fullVisibilityKey);
      convergentDdgEV.getEdgesAndVertices(
        changeVisibility({
          visibilityKey: fullVisibilityKey,
          hideIndices: [4, 6, 8],
        })
      );
      validateDdgEV(convergentDdgEV, [
        {
          visibilityIndices: [5],
          egressNeighborVisibilityIndices: [0],
        },
        {
          visibilityIndices: [0, 1],
          egressNeighborVisibilityIndices: [2, 3],
          ingressNeighborVisibilityIndices: [5],
        },
        {
          visibilityIndices: [2],
          ingressNeighborVisibilityIndices: [0],
        },
        {
          visibilityIndices: [3],
          egressNeighborVisibilityIndices: [7],
          ingressNeighborVisibilityIndices: [0],
        },
        {
          visibilityIndices: [7],
          egressNeighborVisibilityIndices: [9],
          ingressNeighborVisibilityIndices: [3],
        },
        {
          visibilityIndices: [9],
          ingressNeighborVisibilityIndices: [7],
        },
      ]);
    });
  });

  describe('error handling', () => {
    let testDdgEV;
    const validVisibilityIndices = simpleDdgModel.paths[0].members.map(({ visibilityIdx }) => visibilityIdx);
    const fullVisibilityKey = createVisibilityKey(validVisibilityIndices);
    const outOfBoundsVisibilityKey = changeVisibility({
      visibilityKey: fullVisibilityKey,
      showIndices: [validVisibilityIndices.length],
    });

    beforeEach(() => {
      testDdgEV = new DdgEVManager({
        ddgModel: simpleDdgModel,
      });
    });

    it('errors when trying to show index that does not exist', () => {
      testDdgEV.getEdgesAndVertices(fullVisibilityKey);
      expect(() => {
        testDdgEV.getEdgesAndVertices(outOfBoundsVisibilityKey);
      }).toThrowError();
    });

    it('errors when trying to show pathElem that cannot be connected to focalNode', () => {
      expect(() => testDdgEV.getEdgesAndVertices(createVisibilityKey([0, 3]))).toThrowError();
    });

    it('errors when trying to hide index that does not exist', () => {
      testDdgEV.getEdgesAndVertices(fullVisibilityKey);
      testDdgEV.lastVisibilityKey = outOfBoundsVisibilityKey;
      expect(() => testDdgEV.getEdgesAndVertices(fullVisibilityKey)).toThrowError();
    });

    it('errors when trying to hide index that was not visible', () => {
      const allButOneVisible = changeVisibility({ visibilityKey: fullVisibilityKey, hideIndices: [4] });
      testDdgEV.getEdgesAndVertices(allButOneVisible);
      testDdgEV.lastVisibilityKey = fullVisibilityKey;
      expect(() => testDdgEV.getEdgesAndVertices(allButOneVisible)).toThrowError();
    });
  });
});
