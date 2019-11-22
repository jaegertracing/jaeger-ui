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

import GraphModel, { makeGraph } from './index';
import { FOCAL_KEY } from './getPathElemHasher';
import {
  almostDoubleFocalPath,
  convergentPaths,
  doubleFocalPath,
  generationPaths,
  focalPayloadElem,
  simplePath,
  wrap,
} from '../sample-paths.test.resources';
import transformDdgData from '../transformDdgData';
import { ECheckedStatus, EDirection, EDdgDensity } from '../types';
import { encode } from '../visibility-codec';

describe('GraphModel', () => {
  const convergentModel = transformDdgData(wrap(convergentPaths), focalPayloadElem);
  const doubleFocalModel = transformDdgData(wrap([doubleFocalPath, simplePath]), focalPayloadElem);
  const withoutFocalOpModel = transformDdgData(wrap([almostDoubleFocalPath, simplePath]), {
    service: focalPayloadElem.service,
  });
  const simpleModel = transformDdgData(wrap([simplePath]), focalPayloadElem);
  const getIdx = ({ visibilityIdx }) => visibilityIdx;

  describe('constructor', () => {
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

    it('creates focal vertex with multiple operations if focal operation is omitted', () => {
      const withoutFocalOpGraph = new GraphModel({
        ddgModel: withoutFocalOpModel,
        density: EDdgDensity.UpstreamVsDownstream,
        showOp: true,
      });
      validateGraph(withoutFocalOpGraph, [
        {
          visIndices: [0, 1],
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
          visIndices: [7],
          focalSideNeighbors: [3],
        },
        {
          visIndices: [8, 9],
          focalSideNeighbors: [4],
        },
        {
          visIndices: [2, 10],
          focalSideNeighbors: [0, 7],
        },
        {
          visIndices: [6, 11],
          focalSideNeighbors: [2],
        },
      ]);
      expect(withoutFocalOpGraph.vertices.get(FOCAL_KEY).operation).toHaveLength(2);
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

  describe('generations', () => {
    const generationModel = transformDdgData(wrap(generationPaths), focalPayloadElem);
    const generationGraph = makeGraph(generationModel, false, EDdgDensity.MostConcise);
    const oneHopIndices = [
      ...generationGraph.distanceToPathElems.get(-1),
      ...generationGraph.distanceToPathElems.get(0),
      ...generationGraph.distanceToPathElems.get(1),
    ].map(getIdx);
    const allVisible = encode(generationGraph.visIdxToPathElem.map((_elem, idx) => idx));
    const external = ({ isExternal }) => isExternal;
    const internal = ({ isExternal }) => !isExternal;

    const downstreamTargets = generationGraph.distanceToPathElems.get(2);
    const targetKey = generationGraph.getPathElemHasher()(downstreamTargets[0]);
    const upstreamTargets = generationGraph.distanceToPathElems.get(-2);
    const { visibilityIdx: targetLeafIdx } = downstreamTargets.find(external);
    const { visibilityIdx: targetRootIdx } = upstreamTargets.find(external);
    const leafAndRootVisIndices = [...oneHopIndices, targetLeafIdx, targetRootIdx];
    const leafAndRootVisEncoding = encode(leafAndRootVisIndices);
    const [hiddenDownstreamTargetNotLeaf, visibleDownstreamTargetNotLeaf] = downstreamTargets.filter(
      internal
    );
    const [hiddenUpstreamTargetNotRoot, visibleUpstreamTargetNotRoot] = upstreamTargets.filter(internal);
    const partialTargetVisIndices = [
      ...leafAndRootVisIndices,
      visibleDownstreamTargetNotLeaf.visibilityIdx,
      visibleUpstreamTargetNotRoot.visibilityIdx,
    ];
    const partialTargetVisEncoding = encode(partialTargetVisIndices);
    const subsetOfTargetExternalNeighborsVisibilityIndices = [
      visibleDownstreamTargetNotLeaf.externalSideNeighbor.visibilityIdx,
      visibleUpstreamTargetNotRoot.externalSideNeighbor.visibilityIdx,
    ];
    const twoHopIndices = [
      ...oneHopIndices,
      ...downstreamTargets.map(getIdx),
      ...upstreamTargets.map(getIdx),
    ];
    const allButSomeExternalVisEncoding = encode([
      ...twoHopIndices,
      ...subsetOfTargetExternalNeighborsVisibilityIndices,
    ]);

    describe('getGeneration', () => {
      it('returns empty array if key does not exist', () => {
        const absentKey = 'absent key';

        expect(generationGraph.getGeneration(absentKey, EDirection.Downstream)).toEqual([]);
        expect(generationGraph.getGeneration(absentKey, EDirection.Upstream)).toEqual([]);
      });

      it('returns empty array if key has no visible elems', () => {
        expect(
          generationGraph.getGeneration(targetKey, EDirection.Downstream, encode(oneHopIndices))
        ).toEqual([]);

        expect(generationGraph.getGeneration(targetKey, EDirection.Upstream, encode(oneHopIndices))).toEqual(
          []
        );
      });

      it('returns empty array if key is leaf/root elem', () => {
        expect(
          generationGraph.getGeneration(targetKey, EDirection.Downstream, leafAndRootVisEncoding)
        ).toEqual([]);

        expect(generationGraph.getGeneration(targetKey, EDirection.Upstream, leafAndRootVisEncoding)).toEqual(
          []
        );
      });

      it('omits focalSide elems', () => {
        const downstreamResult = generationGraph.getGeneration(
          targetKey,
          EDirection.Downstream,
          partialTargetVisEncoding
        );
        expect(downstreamResult).toEqual([visibleDownstreamTargetNotLeaf.externalSideNeighbor]);
        expect(downstreamResult).toEqual(
          expect.not.arrayContaining([hiddenDownstreamTargetNotLeaf.externalSideNeighbor])
        );
        expect(downstreamResult).toEqual(
          expect.not.arrayContaining([visibleUpstreamTargetNotRoot.focalSideNeighbor])
        );

        const upstreamResult = generationGraph.getGeneration(
          targetKey,
          EDirection.Upstream,
          partialTargetVisEncoding
        );
        expect(upstreamResult).toEqual([visibleUpstreamTargetNotRoot.externalSideNeighbor]);
        expect(upstreamResult).toEqual(
          expect.not.arrayContaining([hiddenUpstreamTargetNotRoot.externalSideNeighbor])
        );
        expect(downstreamResult).toEqual(
          expect.not.arrayContaining([visibleDownstreamTargetNotLeaf.focalSideNeighbor])
        );
      });
    });

    describe('getGenerationVisibility', () => {
      it('returns null if getGeneration returns []', () => {
        expect(
          generationGraph.getGenerationVisibility(targetKey, EDirection.Downstream, leafAndRootVisEncoding)
        ).toEqual(null);

        expect(
          generationGraph.getGenerationVisibility(targetKey, EDirection.Upstream, leafAndRootVisEncoding)
        ).toEqual(null);
      });

      it('returns ECheckedStatus.Empty if all neighbors are hidden', () => {
        expect(generationGraph.getGenerationVisibility(targetKey, EDirection.Downstream)).toEqual(
          ECheckedStatus.Empty
        );
        expect(
          generationGraph.getGenerationVisibility(targetKey, EDirection.Downstream, partialTargetVisEncoding)
        ).toEqual(ECheckedStatus.Empty);

        expect(generationGraph.getGenerationVisibility(targetKey, EDirection.Upstream)).toEqual(
          ECheckedStatus.Empty
        );
        expect(
          generationGraph.getGenerationVisibility(targetKey, EDirection.Upstream, partialTargetVisEncoding)
        ).toEqual(ECheckedStatus.Empty);
      });

      it('returns ECheckedStatus.Full if all neighbors are visible', () => {
        const partialTargetWithRespectiveExternalVisEncoding = encode([
          ...partialTargetVisIndices,
          ...subsetOfTargetExternalNeighborsVisibilityIndices,
        ]);

        expect(generationGraph.getGenerationVisibility(targetKey, EDirection.Downstream, allVisible)).toEqual(
          ECheckedStatus.Full
        );
        expect(
          generationGraph.getGenerationVisibility(
            targetKey,
            EDirection.Downstream,
            partialTargetWithRespectiveExternalVisEncoding
          )
        ).toEqual(ECheckedStatus.Full);

        expect(generationGraph.getGenerationVisibility(targetKey, EDirection.Upstream, allVisible)).toEqual(
          ECheckedStatus.Full
        );
        expect(
          generationGraph.getGenerationVisibility(
            targetKey,
            EDirection.Upstream,
            partialTargetWithRespectiveExternalVisEncoding
          )
        ).toEqual(ECheckedStatus.Full);
      });

      it('returns ECheckedStatus.Partial if only some neighbors are visible', () => {
        expect(
          generationGraph.getGenerationVisibility(
            targetKey,
            EDirection.Downstream,
            allButSomeExternalVisEncoding
          )
        ).toEqual(ECheckedStatus.Partial);

        expect(
          generationGraph.getGenerationVisibility(
            targetKey,
            EDirection.Upstream,
            allButSomeExternalVisEncoding
          )
        ).toEqual(ECheckedStatus.Partial);
      });
    });

    describe('getVisWithUpdatedGeneration', () => {
      const downstreamFullIndices = [
        ...twoHopIndices,
        ...generationGraph.distanceToPathElems.get(3).map(getIdx),
      ];
      const downstreamFullEncoding = encode(downstreamFullIndices);
      const upstreamFullIndices = [
        ...twoHopIndices,
        ...generationGraph.distanceToPathElems.get(-3).map(getIdx),
      ];
      const upstreamFullEncoding = encode(upstreamFullIndices);

      it('returns null if there is no generation to update', () => {
        expect(
          generationGraph.getVisWithUpdatedGeneration(targetKey, EDirection.Downstream, encode(oneHopIndices))
        ).toEqual(null);
        expect(
          generationGraph.getVisWithUpdatedGeneration(targetKey, EDirection.Upstream, encode(oneHopIndices))
        ).toEqual(null);

        expect(
          generationGraph.getVisWithUpdatedGeneration(
            targetKey,
            EDirection.Downstream,
            leafAndRootVisEncoding
          )
        ).toEqual(null);
        expect(
          generationGraph.getVisWithUpdatedGeneration(targetKey, EDirection.Upstream, leafAndRootVisEncoding)
        ).toEqual(null);
      });

      it('emptys target generation if it is full', () => {
        expect(
          generationGraph.getVisWithUpdatedGeneration(targetKey, EDirection.Downstream, allVisible)
        ).toEqual({
          visEncoding: upstreamFullEncoding,
          update: ECheckedStatus.Empty,
        });

        expect(
          generationGraph.getVisWithUpdatedGeneration(targetKey, EDirection.Upstream, allVisible)
        ).toEqual({
          visEncoding: downstreamFullEncoding,
          update: ECheckedStatus.Empty,
        });
      });

      it('fills target generation if it is empty', () => {
        expect(generationGraph.getVisWithUpdatedGeneration(targetKey, EDirection.Downstream)).toEqual({
          visEncoding: downstreamFullEncoding,
          update: ECheckedStatus.Full,
        });

        expect(generationGraph.getVisWithUpdatedGeneration(targetKey, EDirection.Upstream)).toEqual({
          visEncoding: upstreamFullEncoding,
          update: ECheckedStatus.Full,
        });
      });

      it('fills target generation if it is partially full', () => {
        expect(
          generationGraph.getVisWithUpdatedGeneration(
            targetKey,
            EDirection.Downstream,
            allButSomeExternalVisEncoding
          )
        ).toEqual({
          visEncoding: encode([
            ...downstreamFullIndices,
            ...subsetOfTargetExternalNeighborsVisibilityIndices,
          ]),
          update: ECheckedStatus.Full,
        });

        expect(
          generationGraph.getVisWithUpdatedGeneration(
            targetKey,
            EDirection.Upstream,
            allButSomeExternalVisEncoding
          )
        ).toEqual({
          visEncoding: encode([...upstreamFullIndices, ...subsetOfTargetExternalNeighborsVisibilityIndices]),
          update: ECheckedStatus.Full,
        });
      });
    });
  });

  describe('getVisible', () => {
    const convergentGraph = new GraphModel({
      ddgModel: convergentModel,
      density: EDdgDensity.PreventPathEntanglement,
      showOp: true,
    });
    const withoutFocalOpGraph = new GraphModel({
      ddgModel: withoutFocalOpModel,
      density: EDdgDensity.UpstreamVsDownstream,
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
          expect.objectContaining(convergentPaths[0][0]),
          expect.objectContaining(convergentPaths[0][1]),
        ]);
      });

      it('does not return duplicate data when multiple visIndices share vertices and edges', () => {
        const { edges, vertices } = convergentGraph.getVisible(encode([0, 1, 4, 5]));
        expect(edges).toHaveLength(1);
        expect(vertices).toEqual([
          expect.objectContaining(convergentPaths[0][0]),
          expect.objectContaining(convergentPaths[0][1]),
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

      it('returns focal vertex with multiple operations', () => {
        const { vertices } = withoutFocalOpGraph.getVisible(encode([0, 1]));
        const focalOps = vertices[vertices.length - 1].operation;

        expect(focalOps).toEqual(expect.any(Array));
        expect(focalOps).toHaveLength(2);
      });

      it('only returns visible operations for focal vertex', () => {
        const { vertices } = withoutFocalOpGraph.getVisible(encode([0]));
        const focalOp = vertices[vertices.length - 1].operation;

        expect(focalOp).toEqual(expect.any(String));
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
          density: EDdgDensity.PreventPathEntanglement,
        });
        expect(emptyGraph.getVisible()).toEqual({
          edges: [],
          vertices: [],
        });
      });

      it('returns focal vertex with multiple operations', () => {
        const { vertices } = withoutFocalOpGraph.getVisible();
        const focalOps = vertices[vertices.length - 1].operation;

        expect(focalOps).toEqual(expect.any(Array));
        expect(focalOps).toHaveLength(2);
      });
    });
  });

  describe('uiFindMatches', () => {
    const convergentGraph = new GraphModel({
      ddgModel: convergentModel,
      density: EDdgDensity.PreventPathEntanglement,
      showOp: true,
    });
    const hideOpGraph = new GraphModel({
      ddgModel: convergentModel,
      density: EDdgDensity.PreventPathEntanglement,
      showOp: false,
    });
    const withoutFocalOpGraph = new GraphModel({
      ddgModel: withoutFocalOpModel,
      density: EDdgDensity.UpstreamVsDownstream,
      showOp: true,
    });
    const [
      {
        operation: { name: withoutFocalOpZerothOp },
      },
      {
        operation: { name: withoutFocalOpFistOp },
      },
    ] = withoutFocalOpGraph.visIdxToPathElem;
    const shorten = str => str.substring(0, str.length - 3);
    const visEncoding = encode([0, 1, 2, 3, 4, 5]);
    const { vertices: visibleVertices } = convergentGraph.getVisible(visEncoding);
    const { key: focalKey, service: focalService, operation: focalOperation } = visibleVertices[
      visibleVertices.length - 1
    ];
    const { service: otherService } = visibleVertices[2];
    const { vertices: hiddenOpVertices } = hideOpGraph.getVisible(visEncoding);
    const {
      operation: { name: otherOp },
    } = Array.from(hideOpGraph.vertexToPathElems.get(hiddenOpVertices[2]))[0];

    describe('getHiddenUiFindMatches', () => {
      it('returns a subset of hidden vertices that match provided uiFind', () => {
        const uiFind = `${shorten(focalService)} ${shorten(focalOperation)} ${shorten(otherService)}`;
        expect(convergentGraph.getHiddenUiFindMatches(uiFind, encode([0, 1]))).toEqual(
          new Set([visibleVertices[2].key])
        );
      });

      it('matches only on service.name if showOp is false', () => {
        const uiFind = `${shorten(hiddenOpVertices[1].service)} ${shorten(otherOp)}`;
        expect(hideOpGraph.getHiddenUiFindMatches(uiFind, encode([0]))).toEqual(
          new Set([hiddenOpVertices[1].key])
        );
      });

      it('returns an empty set when provided empty or undefined uiFind', () => {
        expect(convergentGraph.getHiddenUiFindMatches()).toEqual(new Set());
        expect(convergentGraph.getHiddenUiFindMatches('')).toEqual(new Set());
        expect(convergentGraph.getVisibleUiFindMatches(' ')).toEqual(new Set());
      });

      it('returns an empty set when all matches are visible', () => {
        const uiFind = `${shorten(focalService)} ${shorten(otherService)}`;
        expect(convergentGraph.getHiddenUiFindMatches(uiFind, visEncoding)).toEqual(new Set());
      });

      it('only matches hidden operations of focal vertex', () => {
        expect(withoutFocalOpGraph.getHiddenUiFindMatches(shorten(withoutFocalOpZerothOp))).toEqual(
          new Set()
        );
        expect(withoutFocalOpGraph.getHiddenUiFindMatches(shorten(withoutFocalOpFistOp))).toEqual(new Set());

        expect(
          withoutFocalOpGraph.getHiddenUiFindMatches(shorten(withoutFocalOpZerothOp), encode([0, 7]))
        ).toEqual(new Set());
        expect(
          withoutFocalOpGraph.getHiddenUiFindMatches(shorten(withoutFocalOpFistOp), encode([0, 7]))
        ).toEqual(new Set([focalKey]));

        expect(
          withoutFocalOpGraph.getHiddenUiFindMatches(shorten(withoutFocalOpZerothOp), encode([1, 7]))
        ).toEqual(new Set([focalKey]));
        expect(
          withoutFocalOpGraph.getHiddenUiFindMatches(shorten(withoutFocalOpFistOp), encode([1]))
        ).toEqual(new Set());
      });

      it('handles empty graph', () => {
        const emptyGraph = new GraphModel({
          ddgModel: { distanceToPathElems: new Map(), visIdxToPathElem: [] },
          density: EDdgDensity.PreventPathEntanglement,
        });
        expect(emptyGraph.getHiddenUiFindMatches('*')).toEqual(new Set());
      });
    });

    describe('getVisibleUiFindMatches', () => {
      it('returns a subset of getVisible that match provided uiFind', () => {
        const uiFind = `${shorten(focalService)} ${shorten(focalOperation)} ${shorten(otherService)}`;
        expect(convergentGraph.getVisibleUiFindMatches(uiFind, visEncoding)).toEqual(
          new Set([focalKey, visibleVertices[2].key])
        );
      });

      it('matches only on service.name if showOp is false', () => {
        const uiFind = `${shorten(focalService)} ${shorten(otherOp)}`;
        expect(hideOpGraph.getVisibleUiFindMatches(uiFind, visEncoding)).toEqual(new Set([focalKey]));
      });

      it('returns an empty set when provided empty or undefined uiFind', () => {
        expect(convergentGraph.getVisibleUiFindMatches()).toEqual(new Set());
        expect(convergentGraph.getVisibleUiFindMatches('')).toEqual(new Set());
        expect(convergentGraph.getVisibleUiFindMatches(' ')).toEqual(new Set());
      });

      it('only matches visible operations of focal vertex', () => {
        expect(
          withoutFocalOpGraph.getVisibleUiFindMatches(shorten(withoutFocalOpZerothOp), encode([0, 1]))
        ).toEqual(new Set([focalKey]));
        expect(
          withoutFocalOpGraph.getVisibleUiFindMatches(shorten(withoutFocalOpFistOp), encode([0, 1]))
        ).toEqual(new Set([focalKey]));

        expect(
          withoutFocalOpGraph.getVisibleUiFindMatches(shorten(withoutFocalOpZerothOp), encode([0]))
        ).toEqual(new Set([focalKey]));
        expect(
          withoutFocalOpGraph.getVisibleUiFindMatches(shorten(withoutFocalOpFistOp), encode([0]))
        ).toEqual(new Set());

        expect(
          withoutFocalOpGraph.getVisibleUiFindMatches(shorten(withoutFocalOpZerothOp), encode([1]))
        ).toEqual(new Set());
        expect(
          withoutFocalOpGraph.getVisibleUiFindMatches(shorten(withoutFocalOpFistOp), encode([1]))
        ).toEqual(new Set([focalKey]));
      });
    });
  });

  describe('getVertexVisiblePathElems', () => {
    const overlapGraph = new GraphModel({
      ddgModel: doubleFocalModel,
      density: EDdgDensity.UpstreamVsDownstream,
      showOp: true,
    });
    const lastElemKey = overlapGraph.getPathElemHasher()(overlapGraph.visIdxToPathElem[6]);

    it('returns `undefined` if key does not match any vertex', () => {
      expect(overlapGraph.getVertexVisiblePathElems('absent key')).toBe(undefined);
    });

    it('returns `undefined` if key has no pathElems', () => {
      const convergentGraph = new GraphModel({
        ddgModel: convergentModel,
        density: EDdgDensity.PreventPathEntanglement,
        showOp: true,
      });
      const focalElemKey = convergentGraph.getPathElemHasher()(convergentGraph.visIdxToPathElem[0]);
      const focalVertex = convergentGraph.vertices.get(focalElemKey);
      convergentGraph.vertexToPathElems.get(focalVertex).clear();
      expect(convergentGraph.getVertexVisiblePathElems(focalElemKey)).toBe(undefined);

      convergentGraph.vertexToPathElems.delete(focalVertex);
      expect(convergentGraph.getVertexVisiblePathElems(focalElemKey)).toBe(undefined);
    });

    it('returns elems within two hops when visEncoding is omitted', () => {
      expect(overlapGraph.getVertexVisiblePathElems(lastElemKey)).toHaveLength(1);
    });

    it('returns visible elems according to provided key', () => {
      const fullKey = encode(Array.from(overlapGraph.visIdxToPathElem.keys()));
      expect(overlapGraph.getVertexVisiblePathElems(lastElemKey, encode([0]))).toHaveLength(0);
      expect(overlapGraph.getVertexVisiblePathElems(lastElemKey, fullKey)).toHaveLength(2);
    });
  });

  describe('getVisWithoutVertex', () => {
    const overlapGraph = new GraphModel({
      ddgModel: convergentModel,
      density: EDdgDensity.OnePerLevel,
      showOp: true,
    });
    const vertexKey = overlapGraph.getPathElemHasher()(overlapGraph.distanceToPathElems.get(2)[0]);

    it('handles absent visEncoding', () => {
      expect(overlapGraph.getVisWithoutVertex(vertexKey)).toBe(encode([0, 1, 2, 3, 4, 5]));
    });

    it('uses provided visEncoding', () => {
      expect(overlapGraph.getVisWithoutVertex(vertexKey, encode([0, 1, 2, 3, 5, 6, 7, 8, 9]))).toBe(
        encode([0, 1, 2, 3, 5])
      );
    });

    it('returns undefined if vertex is already hidden', () => {
      expect(overlapGraph.getVisWithoutVertex(vertexKey, encode([0, 1, 2, 3, 5]))).toBe(undefined);
    });

    it('returns undefined if vertex has no elems', () => {
      expect(overlapGraph.getVisWithoutVertex('absent vertex key')).toBe(undefined);
    });
  });

  describe('getVisWithVertices', () => {
    const overlapGraph = new GraphModel({
      ddgModel: convergentModel,
      density: EDdgDensity.PreventPathEntanglement,
      showOp: true,
    });
    const vertexKeys = [
      overlapGraph.pathElemToVertex.get(overlapGraph.distanceToPathElems.get(3)[0]).key,
      overlapGraph.pathElemToVertex.get(overlapGraph.distanceToPathElems.get(-1)[0]).key,
    ];

    it('handles absent visEncoding', () => {
      expect(overlapGraph.getVisWithVertices(vertexKeys)).toBe(encode([0, 1, 2, 3, 4, 5, 6, 7, 8]));
    });

    it('uses provided visEncoding', () => {
      expect(overlapGraph.getVisWithVertices(vertexKeys, encode([0, 1, 3]))).toBe(
        encode([0, 1, 2, 3, 4, 5, 6, 8])
      );
    });

    it('throws error if given absent vertex', () => {
      expect(() => overlapGraph.getVisWithVertices(['absent key'])).toThrowError(/does not exist in graph/);
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
