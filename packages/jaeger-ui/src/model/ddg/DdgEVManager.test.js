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
  /**
   * This function takes in a DdgEVManager and validates the structure based on the expected vertices.
   *
   * @param {DdgEVManager} ddgEVManager - The DdgEVManager to validate.
   * @param {Object[]} expectedVertices - The vertices that the DdgEvManager should have.
   * @param {number[]} expectedVertices[].visibilityIndices - The visibility indices that should all share one
   *     DdgVertex.
   * @param {number[]} expectedVertices[].egressNeighborVisibilityIndices - A single visibilityIdx is
   *     sufficient to define a neighboring vertex. For each egressNeighborVisibilityIdx, the expectedVertex
   *     should have an egressEdge from the expectedVertex to the vertex represented by the
   *     egressNeighborVisibilityIdx.
   * @param {number[]} expectedVertices[].ingressNeighborVisibilityIndices - A single visibilityIdx is
   *     sufficient to define a neighboring vertex. For each ingressNeighborVisibilityIdx, the expectedVertex
   *     should have an ingressEdge from the expectedVertex to the vertex represented by the
   *     ingressNeighborVisibilityIdx.
   */
  function validateDdgEVManager(ddgEVManager, expectedVertices) {
    let expectedEdgeCount = 0;
    expectedVertices.forEach(
      ({
        visibilityIndices,
        ingressNeighborVisibilityIndices = [],
        egressNeighborVisibilityIndices = [],
      }) => {
        const pathElems = visibilityIndices.map(visibilityIdx =>
          ddgEVManager.visibilityIdxToPathElem.get(visibilityIdx)
        );
        const vertex = ddgEVManager.pathElemToVertex.get(pathElems[0]);
        expect(vertex.pathElems).toEqual(new Set(pathElems));

        expect(vertex.egressEdges.size).toBe(egressNeighborVisibilityIndices.length);
        expectedEdgeCount += vertex.egressEdges.size;
        egressNeighborVisibilityIndices.forEach(egressNeighborVisibilityIdx => {
          const egressNeighbor = ddgEVManager.pathElemToVertex.get(
            ddgEVManager.visibilityIdxToPathElem.get(egressNeighborVisibilityIdx)
          );
          const edge = vertex.egressEdges.get(egressNeighbor);
          expect(edge).toBeDefined();
          expect(egressNeighbor.ingressEdges.get(vertex)).toBe(edge);
          expect(edge.to).toBe(egressNeighbor.key);
          expect(edge.from).toBe(vertex.key);
        });

        expect(vertex.ingressEdges.size).toBe(ingressNeighborVisibilityIndices.length);
        expectedEdgeCount += vertex.ingressEdges.size;
        ingressNeighborVisibilityIndices.forEach(ingressNeighborVisibilityIdx => {
          const ingressNeighbor = ddgEVManager.pathElemToVertex.get(
            ddgEVManager.visibilityIdxToPathElem.get(ingressNeighborVisibilityIdx)
          );
          const edge = vertex.ingressEdges.get(ingressNeighbor);
          expect(edge).toBeDefined();
          expect(ingressNeighbor.egressEdges.get(vertex)).toBe(edge);
          expect(edge.to).toBe(vertex.key);
          expect(edge.from).toBe(ingressNeighbor.key);
        });
      }
    );

    expect(ddgEVManager.vertices.size).toBe(expectedVertices.length);
    expect(ddgEVManager.edges.size).toBe(expectedEdgeCount / 2);
  }

  const simpleDdgModel = transformDdgData([testResources.simplePath], testResources.focalPayloadElem);

  describe('getVertexKey', () => {
    const simpleTestFocalPathElem = simpleDdgModel.paths[0].members[2];
    const expectedKeyEntry = pathElem => `${pathElem.operation.service.name}::${pathElem.operation.name}`;
    const expectedFocalPathElemKey = expectedKeyEntry(simpleTestFocalPathElem);
    // Because getVertexKey is completely context-unaware until late-alpha, an impossibly basic ddg is
    // sufficient to test this method.
    const emptyDdgEVManager = new DdgEVManager({ ddgModel: {} });

    it('creates key for focal pathElem', () => {
      expect(emptyDdgEVManager.getVertexKey(simpleTestFocalPathElem)).toBe(expectedFocalPathElemKey);
    });

    it('creates key for downstream pathElem', () => {
      const targetPathElem = simpleDdgModel.paths[0].members[0];
      const interimPathElem = simpleDdgModel.paths[0].members[1];
      expect(emptyDdgEVManager.getVertexKey(targetPathElem)).toBe(
        [expectedKeyEntry(targetPathElem), expectedKeyEntry(interimPathElem), expectedFocalPathElemKey].join(
          '|'
        )
      );
    });

    it('creates key for downstream pathElem', () => {
      const targetPathElem = simpleDdgModel.paths[0].members[4];
      const interimPathElem = simpleDdgModel.paths[0].members[3];
      expect(emptyDdgEVManager.getVertexKey(targetPathElem)).toBe(
        [expectedFocalPathElemKey, expectedKeyEntry(interimPathElem), expectedKeyEntry(targetPathElem)].join(
          '|'
        )
      );
    });
  });

  describe('simple one-path one-hop ddg', () => {
    let simpleTestDdgEVManager;
    const oneHopVisibilityKey = createVisibilityKey([0, 1, 2]);

    beforeEach(() => {
      simpleTestDdgEVManager = new DdgEVManager({
        ddgModel: simpleDdgModel,
      });
      simpleTestDdgEVManager.getEdgesAndVertices(oneHopVisibilityKey);
    });

    it('creates three vertices and two edges for one-path one-hop ddg', () => {
      validateDdgEVManager(simpleTestDdgEVManager, [
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
      simpleTestDdgEVManager.getEdgesAndVertices(
        changeVisibility({ visibilityKey: oneHopVisibilityKey, hideIndices: [1] })
      );

      validateDdgEVManager(simpleTestDdgEVManager, [
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
    let convergentDdgEVManager;

    beforeEach(() => {
      const convergentDdgModel = transformDdgData(
        testResources.convergentPaths,
        testResources.focalPayloadElem
      );
      convergentDdgEVManager = new DdgEVManager({
        ddgModel: convergentDdgModel,
      });
      convergentDdgEVManager.getEdgesAndVertices(oneHopVisibilityKey);
    });

    it('creates 3 edges and 4 vertices for initial hop', () => {
      validateDdgEVManager(convergentDdgEVManager, [
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
      convergentDdgEVManager.getEdgesAndVertices(
        changeVisibility({ visibilityKey: oneHopVisibilityKey, showIndices: [6, 7] })
      );
      validateDdgEVManager(convergentDdgEVManager, [
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

    it('adds separate vertices for equal PathElems that have equal focalSideNeighbors but those have different focalSideNeighbors', () => {
      convergentDdgEVManager.getEdgesAndVertices(fullVisibilityKey);
      validateDdgEVManager(convergentDdgEVManager, [
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
      convergentDdgEVManager.getEdgesAndVertices(fullVisibilityKey);
      convergentDdgEVManager.getEdgesAndVertices(
        changeVisibility({
          visibilityKey: fullVisibilityKey,
          // visibility indices 4, 6, 8 represent the pathElems on the path containing the divergentPathElem
          // that have an equal pathElem on the path with which it converges.
          hideIndices: [4, 6, 8],
        })
      );
      validateDdgEVManager(convergentDdgEVManager, [
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
    let testDdgEVManager;
    const validVisibilityIndices = simpleDdgModel.paths[0].members.map(({ visibilityIdx }) => visibilityIdx);
    const fullVisibilityKey = createVisibilityKey(validVisibilityIndices);
    const outOfBoundsVisibilityKey = changeVisibility({
      visibilityKey: fullVisibilityKey,
      showIndices: [validVisibilityIndices.length],
    });

    beforeEach(() => {
      testDdgEVManager = new DdgEVManager({
        ddgModel: simpleDdgModel,
      });
    });

    it('errors when trying to show index that does not exist', () => {
      testDdgEVManager.getEdgesAndVertices(fullVisibilityKey);
      expect(() => {
        testDdgEVManager.getEdgesAndVertices(outOfBoundsVisibilityKey);
      }).toThrowError();
    });

    it('errors when trying to show pathElem that cannot be connected to focalNode', () => {
      expect(() => testDdgEVManager.getEdgesAndVertices(createVisibilityKey([0, 3]))).toThrowError();
    });

    it('errors when trying to hide index that does not exist', () => {
      testDdgEVManager.getEdgesAndVertices(fullVisibilityKey);
      testDdgEVManager.lastVisibilityKey = outOfBoundsVisibilityKey;
      expect(() => testDdgEVManager.getEdgesAndVertices(fullVisibilityKey)).toThrowError();
    });

    it('errors when trying to hide index that was not visible', () => {
      const allButOneVisible = changeVisibility({ visibilityKey: fullVisibilityKey, hideIndices: [4] });
      testDdgEVManager.getEdgesAndVertices(allButOneVisible);
      testDdgEVManager.lastVisibilityKey = fullVisibilityKey;
      expect(() => testDdgEVManager.getEdgesAndVertices(allButOneVisible)).toThrowError();
    });
  });
});
