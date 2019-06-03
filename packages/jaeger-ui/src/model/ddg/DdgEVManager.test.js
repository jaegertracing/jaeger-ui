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
import { changeKey, createKey } from './visibility-key';

import DdgEVManager from './DdgEVManager';

describe('DdgEVManager', () => {
  /**
   * This function takes in a DdgEVManager and validates the structure based on the expected vertices.
   *
   * @param {DdgEVManager} manager - The DdgEVManager to validate.
   * @param {Object[]} expectedVertices - The vertices that the DdgEvManager should have.
   * @param {number[]} expectedVertices[].visibilityIndices - The visibility indices that should all share one
   *     DdgVertex.
   * @param {number[]} expectedVertices[].egressNeighbors - A single visibilityIdx is sufficient to define a
   *     neighboring vertex. For each egressNeighbor visibilityIdx, the expectedVertex should have an
   *     egressEdge from the expectedVertex to the vertex represented by the egressNeighbor visibilityIdx.
   * @param {number[]} expectedVertices[].ingressNeighbors - A single visibilityIdx is sufficient to define a
   *     neighboring vertex. For each ingressNeighbor visibilityIdx, the expectedVertex should have an
   *     ingressEdge from the vertex represented by the ingressNeighbor visibilityIdx to the expectedVertex.
   */
  function validateDdgEVManager(manager, expectedVertices) {
    let expectedEdgeCount = 0;
    expectedVertices.forEach(({ visibilityIndices, ingressNeighbors = [], egressNeighbors = [] }) => {
      const pathElems = visibilityIndices.map(visibilityIdx =>
        manager.visibilityIdxToPathElem.get(visibilityIdx)
      );
      const vertex = manager.pathElemToVertex.get(pathElems[0]);
      expect(vertex.pathElems).toEqual(new Set(pathElems));

      expect(vertex.egressEdges.size).toBe(egressNeighbors.length);
      expectedEdgeCount += vertex.egressEdges.size;
      egressNeighbors.forEach(egressNeighborIdx => {
        const egressNeighbor = manager.pathElemToVertex.get(
          manager.visibilityIdxToPathElem.get(egressNeighborIdx)
        );
        const edge = vertex.egressEdges.get(egressNeighbor);
        expect(edge).toBeDefined();
        expect(egressNeighbor.ingressEdges.get(vertex)).toBe(edge);
        expect(edge.to).toBe(egressNeighbor.key);
        expect(edge.from).toBe(vertex.key);
      });

      expect(vertex.ingressEdges.size).toBe(ingressNeighbors.length);
      expectedEdgeCount += vertex.ingressEdges.size;
      ingressNeighbors.forEach(ingressNeighborIdx => {
        const ingressNeighbor = manager.pathElemToVertex.get(
          manager.visibilityIdxToPathElem.get(ingressNeighborIdx)
        );
        const edge = vertex.ingressEdges.get(ingressNeighbor);
        expect(edge).toBeDefined();
        expect(ingressNeighbor.egressEdges.get(vertex)).toBe(edge);
        expect(edge.to).toBe(vertex.key);
        expect(edge.from).toBe(ingressNeighbor.key);
      });
    });

    expect(manager.vertices.size).toBe(expectedVertices.length);
    expect(manager.edges.size).toBe(expectedEdgeCount / 2);
  }

  const simpleDdgModel = transformDdgData([testResources.simplePath], testResources.focalPayloadElem);

  describe('getVertexKey', () => {
    const testFocalElem = simpleDdgModel.paths[0].members[2];
    const expectedKeyEntry = pathElem => `${pathElem.operation.service.name}::${pathElem.operation.name}`;
    const expectedFocalElemKey = expectedKeyEntry(testFocalElem);
    // Because getVertexKey is completely context-unaware until late-alpha, an impossibly basic ddg is
    // sufficient to test this method.
    const emptyManager = new DdgEVManager({ ddgModel: {} });

    it('creates key for focal pathElem', () => {
      expect(emptyManager.getVertexKey(testFocalElem)).toBe(expectedFocalElemKey);
    });

    it('creates key for downstream pathElem', () => {
      const targetElem = simpleDdgModel.paths[0].members[0];
      const interimElem = simpleDdgModel.paths[0].members[1];
      expect(emptyManager.getVertexKey(targetElem)).toBe(
        [expectedKeyEntry(targetElem), expectedKeyEntry(interimElem), expectedFocalElemKey].join('|')
      );
    });

    it('creates key for downstream pathElem', () => {
      const targetElem = simpleDdgModel.paths[0].members[4];
      const interimElem = simpleDdgModel.paths[0].members[3];
      expect(emptyManager.getVertexKey(targetElem)).toBe(
        [expectedFocalElemKey, expectedKeyEntry(interimElem), expectedKeyEntry(targetElem)].join('|')
      );
    });
  });

  describe('simple one-path one-hop ddg', () => {
    let testManager;
    const oneHopKey = createKey([0, 1, 2]);

    beforeEach(() => {
      testManager = new DdgEVManager({
        ddgModel: simpleDdgModel,
      });
      testManager.getEdgesAndVertices(oneHopKey);
    });

    it('creates three vertices and two edges for one-path one-hop ddg', () => {
      validateDdgEVManager(testManager, [
        {
          visibilityIndices: [0],
          ingressNeighbors: [2],
          egressNeighbors: [1],
        },
        {
          visibilityIndices: [1],
          ingressNeighbors: [0],
        },
        {
          visibilityIndices: [2],
          egressNeighbors: [0],
        },
      ]);
    });

    it('removes vertex and edge', () => {
      testManager.getEdgesAndVertices(changeKey({ key: oneHopKey, hide: [1] }));

      validateDdgEVManager(testManager, [
        {
          visibilityIndices: [0],
          ingressNeighbors: [2],
        },
        {
          visibilityIndices: [2],
          egressNeighbors: [0],
        },
      ]);
    });
  });

  describe('convergent paths', () => {
    const oneHopKey = createKey([0, 1, 2, 3, 4, 5]);
    const fullKey = changeKey({
      key: oneHopKey,
      show: [6, 7, 8, 9],
    });
    const downstreamAndFocalValidationParams = [
      {
        visibilityIndices: [0, 1],
        egressNeighbors: [2, 3],
        ingressNeighbors: [4],
      },
      {
        visibilityIndices: [4, 5],
        egressNeighbors: [0],
      },
    ];
    let convergentManager;

    beforeEach(() => {
      const convergentDdgModel = transformDdgData(
        testResources.convergentPaths,
        testResources.focalPayloadElem
      );
      convergentManager = new DdgEVManager({
        ddgModel: convergentDdgModel,
      });
      convergentManager.getEdgesAndVertices(oneHopKey);
    });

    it('creates 3 edges and 4 vertices for initial hop', () => {
      validateDdgEVManager(convergentManager, [
        ...downstreamAndFocalValidationParams,
        {
          visibilityIndices: [2],
          ingressNeighbors: [0],
        },
        {
          visibilityIndices: [3],
          ingressNeighbors: [0],
        },
      ]);
    });

    it('adds separate vertices for equal PathElems that have different focalSideNeighbors', () => {
      convergentManager.getEdgesAndVertices(changeKey({ key: oneHopKey, show: [6, 7] }));
      validateDdgEVManager(convergentManager, [
        ...downstreamAndFocalValidationParams,
        {
          visibilityIndices: [2],
          egressNeighbors: [6],
          ingressNeighbors: [0],
        },
        {
          visibilityIndices: [6],
          ingressNeighbors: [2],
        },
        {
          visibilityIndices: [3],
          egressNeighbors: [7],
          ingressNeighbors: [0],
        },
        {
          visibilityIndices: [7],
          ingressNeighbors: [3],
        },
      ]);
    });

    it('adds separate vertices for equal PathElems that have equal focalSideNeighbors but those have different focalSideNeighbors', () => {
      convergentManager.getEdgesAndVertices(fullKey);
      validateDdgEVManager(convergentManager, [
        ...downstreamAndFocalValidationParams,
        {
          visibilityIndices: [2],
          egressNeighbors: [6],
          ingressNeighbors: [0],
        },
        {
          visibilityIndices: [6],
          egressNeighbors: [8],
          ingressNeighbors: [2],
        },
        {
          visibilityIndices: [8],
          ingressNeighbors: [6],
        },
        {
          visibilityIndices: [3],
          egressNeighbors: [7],
          ingressNeighbors: [0],
        },
        {
          visibilityIndices: [7],
          egressNeighbors: [9],
          ingressNeighbors: [3],
        },
        {
          visibilityIndices: [9],
          ingressNeighbors: [7],
        },
      ]);
    });

    it('removes pathElems without removing other pathElems with same service & operation', () => {
      convergentManager.getEdgesAndVertices(fullKey);
      convergentManager.getEdgesAndVertices(
        changeKey({
          key: fullKey,
          // visibility indices 4, 6, 8 represent the pathElems on the path containing the divergentPathElem
          // that have an equal pathElem on the path with which it converges.
          hide: [4, 6, 8],
        })
      );
      validateDdgEVManager(convergentManager, [
        {
          visibilityIndices: [5],
          egressNeighbors: [0],
        },
        {
          visibilityIndices: [0, 1],
          egressNeighbors: [2, 3],
          ingressNeighbors: [5],
        },
        {
          visibilityIndices: [2],
          ingressNeighbors: [0],
        },
        {
          visibilityIndices: [3],
          egressNeighbors: [7],
          ingressNeighbors: [0],
        },
        {
          visibilityIndices: [7],
          egressNeighbors: [9],
          ingressNeighbors: [3],
        },
        {
          visibilityIndices: [9],
          ingressNeighbors: [7],
        },
      ]);
    });
  });

  describe('error handling', () => {
    let testManager;
    const validIndices = simpleDdgModel.paths[0].members.map(({ visibilityIdx }) => visibilityIdx);
    const fullKey = createKey(validIndices);
    const outOfBoundsKey = changeKey({
      key: fullKey,
      show: [validIndices.length],
    });

    beforeEach(() => {
      testManager = new DdgEVManager({
        ddgModel: simpleDdgModel,
      });
    });

    it('errors when trying to show index that does not exist', () => {
      testManager.getEdgesAndVertices(fullKey);
      expect(() => {
        testManager.getEdgesAndVertices(outOfBoundsKey);
      }).toThrowError();
    });

    it('errors when trying to show pathElem that cannot be connected to focalNode', () => {
      expect(() => testManager.getEdgesAndVertices(createKey([0, 3]))).toThrowError();
    });

    it('errors when trying to hide index that does not exist', () => {
      testManager.getEdgesAndVertices(fullKey);
      testManager.lastVisibilityKey = outOfBoundsKey;
      expect(() => testManager.getEdgesAndVertices(fullKey)).toThrowError();
    });

    it('errors when trying to hide index that was not visible', () => {
      const allButOneVisible = changeKey({ key: fullKey, hide: [4] });
      testManager.getEdgesAndVertices(allButOneVisible);
      testManager.lastVisibilityKey = fullKey;
      expect(() => testManager.getEdgesAndVertices(allButOneVisible)).toThrowError();
    });
  });
});
