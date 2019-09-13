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

import { convergentPaths, focalPayloadElem, simplePath, wrap } from '../sample-paths.test.resources';
import transformDdgData from '../transformDdgData';

import GraphModel, { makeGraph } from './index';
import { EDdgDensity } from '../types';
import { encode } from '../visibility-codec';

describe('GraphModel', () => {
  const convergentModel = transformDdgData(convergentPaths.map(wrap), focalPayloadElem);
  const simpleModel = transformDdgData([simplePath].map(wrap), focalPayloadElem);

  /**
   * This function takes in a Graph and validates the structure based on the expected vertices.
   *
   * @param {GraphModel} graph - The Graph to validate.
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
    // Because getVertexKey only uses density, showOp, and the specific pathElem, an empty ddg model is
    // sufficient to test this method.
    const ddgModel = { visIdxToPathElem: [] };
    const showOpKeyEntry = pathElem => `${pathElem.operation.service.name}----${pathElem.operation.name}`;
    const noOpKeyEntry = pathElem => pathElem.operation.service.name;

    [true, false].forEach(showOp => {
      describe(`showOp is ${showOp}`, () => {
        const expectedKeyEntry = showOp ? showOpKeyEntry : noOpKeyEntry;
        // Always show the operation for the focal node
        const expectedFocalElemKey = showOpKeyEntry(testFocalElem);

        describe('MostConcise', () => {
          const emptyGraph = new GraphModel({ ddgModel, density: EDdgDensity.MostConcise, showOp });

          it('creates key for focal pathElem', () => {
            expect(emptyGraph.getVertexKey(testFocalElem)).toBe(expectedFocalElemKey);
          });

          it('creates key for an upstream pathElem', () => {
            const targetElem = simpleModel.paths[0].members[0];
            expect(emptyGraph.getVertexKey(targetElem)).toBe(expectedKeyEntry(targetElem));
          });

          it('creates key for a downstream pathElem', () => {
            const targetElem = simpleModel.paths[0].members[4];
            expect(emptyGraph.getVertexKey(targetElem)).toBe(expectedKeyEntry(targetElem));
          });
        });

        describe('UpstreamVsDownstream', () => {
          const emptyGraph = new GraphModel({ ddgModel, density: EDdgDensity.UpstreamVsDownstream, showOp });

          it('creates key for focal pathElem', () => {
            expect(emptyGraph.getVertexKey(testFocalElem)).toBe(`${expectedFocalElemKey}=0`);
          });

          it('creates key for an upstream pathElem', () => {
            const targetElem = simpleModel.paths[0].members[0];
            expect(emptyGraph.getVertexKey(targetElem)).toBe(`${expectedKeyEntry(targetElem)}=-1`);
          });

          it('creates key for a downstream pathElem', () => {
            const targetElem = simpleModel.paths[0].members[4];
            expect(emptyGraph.getVertexKey(targetElem)).toBe(`${expectedKeyEntry(targetElem)}=1`);
          });
        });

        describe('PreventPathEntanglement', () => {
          const emptyGraph = new GraphModel({
            ddgModel,
            density: EDdgDensity.PreventPathEntanglement,
            showOp,
          });

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

        describe('ExternalVsInternal', () => {
          const emptyGraph = new GraphModel({ ddgModel, density: EDdgDensity.ExternalVsInternal, showOp });

          it('creates key for focal pathElem', () => {
            expect(emptyGraph.getVertexKey(testFocalElem)).toBe(expectedFocalElemKey);
          });

          it('creates key for an upstream pathElem', () => {
            const targetElem = simpleModel.paths[0].members[1];
            expect(emptyGraph.getVertexKey(targetElem)).toBe(
              [expectedKeyEntry(targetElem), expectedFocalElemKey].join('____')
            );
          });

          it('creates key for an external upstream pathElem', () => {
            const targetElem = simpleModel.paths[0].members[0];
            const interimElem = simpleModel.paths[0].members[1];
            expect(emptyGraph.getVertexKey(targetElem)).toBe(
              `${[expectedKeyEntry(targetElem), expectedKeyEntry(interimElem), expectedFocalElemKey].join(
                '____'
              )}----external`
            );
          });

          it('creates key for a downstream pathElem', () => {
            const targetElem = simpleModel.paths[0].members[3];
            expect(emptyGraph.getVertexKey(targetElem)).toBe(
              [expectedFocalElemKey, expectedKeyEntry(targetElem)].join('____')
            );
          });

          it('creates key for an external downstream pathElem', () => {
            const targetElem = simpleModel.paths[0].members[4];
            const interimElem = simpleModel.paths[0].members[3];
            expect(emptyGraph.getVertexKey(targetElem)).toBe(
              `${[expectedFocalElemKey, expectedKeyEntry(interimElem), expectedKeyEntry(targetElem)].join(
                '____'
              )}----external`
            );
          });
        });
      });
    });

    it('throws error when not given supported density', () => {
      const invalidDensityGraph = new GraphModel({
        ddgModel,
        density: `${EDdgDensity.MostConcise} ${EDdgDensity.MostConcise}`,
        showOp: true,
      });
      expect(() => invalidDensityGraph.getVertexKey({ memberOf: {} })).toThrowError();

      const noDensityGraph = new GraphModel({ ddgModel, density: undefined, showOp: true });
      expect(() => noDensityGraph.getVertexKey({ memberOf: {} })).toThrowError();
    });
  });

  describe('constructor', () => {
    it('creates five vertices and four edges for one-path ddg', () => {
      const testGraph = new GraphModel({
        ddgModel: simpleModel,
        density: EDdgDensity.PreventPathEntanglement,
        showOp: true,
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
      const convergentGraph = new GraphModel({
        ddgModel: convergentModel,
        density: EDdgDensity.PreventPathEntanglement,
        showOp: true,
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
      const convergentGraph = new GraphModel({
        ddgModel: convergentModel,
        density: EDdgDensity.PreventPathEntanglement,
        showOp: true,
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
            new GraphModel({
              ddgModel: invalidModel,
              density: EDdgDensity.PreventPathEntanglement,
              showOp: true,
            })
        ).toThrowError();
      });
    });
  });

  describe('getVisible', () => {
    const convergentGraph = new GraphModel({
      ddgModel: convergentModel,
      density: EDdgDensity.PreventPathEntanglement,
      showOp: true,
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

      it('is resiliant against mutation of the ddg model', () => {
        const willMutate = convergentModel.visIdxToPathElem.slice();
        const victimOfMutation = new GraphModel({
          ddgModel: {
            visIdxToPathElem: willMutate,
          },
          density: EDdgDensity.PreventPathEntanglement,
        });
        const idx = willMutate.length - 1;
        const prior = victimOfMutation.getVisible(encode([idx]));
        willMutate.push({ problematic: 'pathElem' });
        const now = victimOfMutation.getVisible(encode([idx, idx + 1]));
        expect(prior).toEqual(now);
      });
    });

    describe('visEncoding not provided', () => {
      it('returns edges and vertices within two hops', () => {
        const twoHopGraph = new GraphModel({
          ddgModel: simpleModel,
          density: EDdgDensity.PreventPathEntanglement,
        });
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
        const emptyGraph = new GraphModel({
          ddgModel: { distanceToPathElems: new Map(), visIdxToPathElem: [] },
        });
        expect(emptyGraph.getVisible()).toEqual({
          edges: [],
          vertices: [],
        });
      });
    });
  });

  describe('getVisibleUiFindMatches', () => {
    const convergentGraph = new GraphModel({
      ddgModel: convergentModel,
      density: EDdgDensity.PreventPathEntanglement,
      showOp: true,
    });
    const shorten = str => str.substring(0, str.length - 3);
    const visEncoding = encode([0, 1, 2, 3, 4, 5]);

    it('returns a subset of getVisible that match provided uiFind', () => {
      const { vertices: visibleVertices } = convergentGraph.getVisible(visEncoding);
      const { service, operation } = visibleVertices[0];
      const { service: otherService } = visibleVertices[2];
      const uiFind = `${shorten(service)} ${shorten(operation)} ${shorten(otherService)}`;
      expect(convergentGraph.getVisibleUiFindMatches(uiFind, visEncoding)).toEqual(
        new Set([visibleVertices[0], visibleVertices[2]])
      );
    });

    it('matches only on service.name if showOp is false', () => {
      const hideOpGraph = new GraphModel({
        ddgModel: convergentModel,
        density: EDdgDensity.PreventPathEntanglement,
        showOp: false,
      });
      const { vertices: visibleVertices } = hideOpGraph.getVisible(visEncoding);
      const { service } = visibleVertices[0];
      const {
        operation: { name: operation },
      } = Array.from(hideOpGraph.vertexToPathElems.get(visibleVertices[2]))[0];
      const uiFind = `${shorten(service)} ${shorten(operation)}`;
      expect(hideOpGraph.getVisibleUiFindMatches(uiFind, visEncoding)).toEqual(new Set([visibleVertices[0]]));
    });

    it('returns an empty set when provided empty or undefined uiFind', () => {
      expect(convergentGraph.getVisibleUiFindMatches()).toEqual(new Set());
      expect(convergentGraph.getVisibleUiFindMatches('')).toEqual(new Set());
    });
  });

  describe('makeGraph', () => {
    it('returns Graph with correct properties', () => {
      const graph = makeGraph(convergentModel, true, EDdgDensity.PreventPathEntanglement);
      expect(graph instanceof GraphModel).toBe(true);
      expect(graph.density).toBe(EDdgDensity.PreventPathEntanglement);
      expect(graph.distanceToPathElems).toEqual(convergentModel.distanceToPathElems);
      expect(graph.showOp).toBe(true);
      expect(graph.visIdxToPathElem).toEqual(convergentModel.visIdxToPathElem);
    });
  });
});
