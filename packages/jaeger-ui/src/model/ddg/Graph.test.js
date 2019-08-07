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

import { convergentPaths, focalPayloadElem, simplePath, wrap } from './sample-paths.test.resources';
import transformDdgData from './transformDdgData';

import Graph from './Graph';
import { encode } from './visibility-codec';

describe('Graph', () => {
  const convergentModel = transformDdgData(convergentPaths.map(wrap), focalPayloadElem);
  const simpleModel = transformDdgData([simplePath].map(wrap), focalPayloadElem);

  /**
   * This function takes in a Graph and validates the structure based on the expected vertices.
   *
   * @param {Graph} graph - The Graph to validate.
   * @param {Object[]} expectedVertices - The vertices that the Graph should have.
   * @param {number[]} expectedVertices[].visIndices - The visibility indices that should all share one
   *     DdgVertex.
   * @param {number[]} expectedVertices[].focalSIdeNeighbors - A single visibilityIdx is sufficient to define a
   *     neighboring vertex. For each focalSide visibilityIdx, the expectedVertex should have an
   *     edge connecting the expectedVertex back to the focalSideNeighbor.
   */
  function validateGraph(graph, expectedVertices) {
    let expectedEdgeCount = 0;
    expectedVertices.forEach(({ visIndices, focalSideNeighbors = [] }) => {
      // Validate that all visIndices share the same vertex
      const pathElems = visIndices.map(visIdx => graph.visIdxToPathElem[visIdx]);
      const vertices = pathElems.map(elem => graph.pathElemToVertex.get(elem));
      const vertex = vertices[0];
      expect(new Set(vertices)).toEqual(new Set([vertex]));
      // Validate that the common vertex is associated with all of its pathElems
      expect(graph.vertexToPathElems.get(vertex)).toEqual(new Set(pathElems));

      // Validate that there is an edge connecting the vertex with each expected focalSideNeighbor
      expectedEdgeCount += focalSideNeighbors.length;
      const focalSideEdges = Array.from(
        new Set(pathElems.map(elem => graph.pathElemToEdge.get(elem)))
      ).filter(Boolean);
      const focalSideKeys = focalSideEdges.map(({ to, from }) => (to === vertex.key ? from : to));
      const expectedKeys = focalSideNeighbors.map(
        idx => graph.pathElemToVertex.get(graph.visIdxToPathElem[idx]).key
      );
      expect(focalSideKeys).toEqual(expectedKeys);
    });

    // Validate that there aren't any rogue vertices nor edges
    expect(graph.vertices.size).toBe(expectedVertices.length);
    expect(new Set(graph.pathElemToEdge.values()).size).toBe(expectedEdgeCount);
  }

  describe('getVertexKey', () => {
    const testFocalElem = simpleModel.paths[0].members[2];
    const expectedKeyEntry = pathElem => `${pathElem.operation.service.name}----${pathElem.operation.name}`;
    const expectedFocalElemKey = expectedKeyEntry(testFocalElem);
    // Because getVertexKey is completely context-unaware until late-alpha, an empty ddg is sufficient to test
    // this method.
    const emptyGraph = new Graph({ ddgModel: { visIdxToPathElem: [] } });

    it('creates key for focal pathElem', () => {
      expect(emptyGraph.getVertexKey(testFocalElem)).toBe(expectedFocalElemKey);
    });

    it('creates key for an upstream pathElem', () => {
      const targetElem = simpleModel.paths[0].members[0];
      const interimElem = simpleModel.paths[0].members[1];
      expect(emptyGraph.getVertexKey(targetElem)).toBe(
        [expectedKeyEntry(targetElem), expectedKeyEntry(interimElem), expectedFocalElemKey].join('____')
      );
    });

    it('creates key for a downstream pathElem', () => {
      const targetElem = simpleModel.paths[0].members[4];
      const interimElem = simpleModel.paths[0].members[3];
      expect(emptyGraph.getVertexKey(targetElem)).toBe(
        [expectedFocalElemKey, expectedKeyEntry(interimElem), expectedKeyEntry(targetElem)].join('____')
      );
    });
  });

  describe('constructor', () => {
    it('creates five vertices and four edges for one-path ddg', () => {
      const testGraph = new Graph({
        ddgModel: simpleModel,
      });
      validateGraph(testGraph, [
        {
          visIndices: [0],
        },
        {
          visIndices: [1],
          focalSideNeighbors: [0],
        },
        {
          visIndices: [2],
          focalSideNeighbors: [0],
        },
        {
          visIndices: [3],
          focalSideNeighbors: [1],
        },
        {
          visIndices: [4],
          focalSideNeighbors: [2],
        },
      ]);
    });
  });

  describe('convergent paths', () => {
    it('adds separate vertices for equal PathElems that have different focalPaths, even those with equal focalSideNeighbors', () => {
      const convergentGraph = new Graph({
        ddgModel: convergentModel,
      });
      validateGraph(convergentGraph, [
        {
          visIndices: [0, 1],
        },
        {
          visIndices: [2],
          focalSideNeighbors: [0],
        },
        {
          visIndices: [3],
          focalSideNeighbors: [0],
        },
        {
          visIndices: [4, 5],
          focalSideNeighbors: [0],
        },
        {
          visIndices: [6],
          focalSideNeighbors: [2],
        },
        {
          visIndices: [7],
          focalSideNeighbors: [3],
        },
        {
          visIndices: [8],
          focalSideNeighbors: [6],
        },
        {
          visIndices: [9],
          focalSideNeighbors: [7],
        },
      ]);
    });

    it('reuses edge when possible', () => {
      const convergentGraph = new Graph({
        ddgModel: convergentModel,
      });
      const sharedEdgeElemA = convergentGraph.visIdxToPathElem[5];
      const sharedEdgeElemB = convergentGraph.visIdxToPathElem[4];

      expect(convergentGraph.pathElemToEdge.get(sharedEdgeElemA)).toBe(
        convergentGraph.pathElemToEdge.get(sharedEdgeElemB)
      );
    });

    describe('error cases', () => {
      it('errors if given model contains a pathElem that cannot be connected to the focal node', () => {
        const invalidModel = {
          ...simpleModel,
          visIdxToPathElem: simpleModel.visIdxToPathElem.slice(),
        };
        invalidModel.visIdxToPathElem.splice(1, 1);
        expect(
          () =>
            new Graph({
              ddgModel: invalidModel,
            })
        ).toThrowError();
      });
    });
  });

  describe('getVisible', () => {
    const convergentGraph = new Graph({
      ddgModel: convergentModel,
    });

    describe('visEncoding provided', () => {
      it('returns just focalNode', () => {
        const { edges, vertices } = convergentGraph.getVisible(encode([0]));
        expect(edges).toHaveLength(0);
        expect(vertices).toEqual([expect.objectContaining(convergentPaths[0][1])]);
      });

      it('returns two specified vertices and their connecting edge', () => {
        const { edges, vertices } = convergentGraph.getVisible(encode([0, 4]));
        expect(edges).toHaveLength(1);
        expect(vertices).toEqual([
          expect.objectContaining(convergentPaths[0][1]),
          expect.objectContaining(convergentPaths[0][0]),
        ]);
      });

      it('does not return duplicate data when multiple visIndices share vertices and edges', () => {
        const { edges, vertices } = convergentGraph.getVisible(encode([0, 1, 4, 5]));
        expect(edges).toHaveLength(1);
        expect(vertices).toEqual([
          expect.objectContaining(convergentPaths[0][1]),
          expect.objectContaining(convergentPaths[0][0]),
        ]);
      });

      it('handles out of bounds visIdx', () => {
        const { edges, vertices } = convergentGraph.getVisible(encode([100]));
        expect(edges).toHaveLength(0);
        expect(vertices).toHaveLength(0);
      });

      it('errors if pathElem is mutated into model after graph is created', () => {
        const willMutate = convergentModel.visIdxToPathElem.slice();
        const victimOfMutation = new Graph({ ddgModel: { visIdxToPathElem: willMutate } });
        const newIdx = willMutate.push({ problematic: 'pathElem' }) - 1;
        expect(() => victimOfMutation.getVisible(encode([newIdx]))).toThrowError();
      });
    });

    describe('visEncoding not provided', () => {
      it('returns edges and vertices within two hops', () => {
        const twoHopGraph = new Graph({ ddgModel: simpleModel });
        const expectedVertices = simpleModel.visIdxToPathElem.map(elem =>
          twoHopGraph.pathElemToVertex.get(elem)
        );
        const expectedEdges = simpleModel.visIdxToPathElem
          .filter(elem => elem.distance)
          .map(elem => twoHopGraph.pathElemToEdge.get(elem));
        const { edges, vertices } = twoHopGraph.getVisible();
        expect(new Set(edges)).toEqual(new Set(expectedEdges));
        expect(new Set(vertices)).toEqual(new Set(expectedVertices));
      });

      it('handles graphs smaller than two hops', () => {
        const emptyGraph = new Graph({ ddgModel: { distanceToPathElems: new Map(), visIdxToPathElem: [] } });
        expect(emptyGraph.getVisible()).toEqual({
          edges: [],
          vertices: [],
        });
      });
    });
  });

  describe('getVisible', () => {
    const convergentGraph = new Graph({
      ddgModel: convergentModel,
    });

    it('returns a subset of getVisible that match provided uiFind', () => {
      const visEncoding = encode([0, 1, 2, 3, 4, 5]);
      const { vertices: visibleVertices } = convergentGraph.getVisible(visEncoding);
      const { service, operation } = visibleVertices[0];
      const { service: otherService } = visibleVertices[2];
      const partial = str => str.substring(0, service.length - 3);
      const uiFind = `${partial(service)} ${partial(operation)} ${partial(otherService)}`;
      expect(convergentGraph.getVisibleUiFindMatches(uiFind, visEncoding)).toEqual(
        new Set([visibleVertices[0], visibleVertices[2]])
      );
    });

    it('returns an empty set when provided empty or undefined uiFind', () => {
      expect(convergentGraph.getVisibleUiFindMatches()).toEqual(new Set());
      expect(convergentGraph.getVisibleUiFindMatches('')).toEqual(new Set());
    });
  });
});
