// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { makeGraph } from '.';
import * as testResources from '../sample-paths.test.resources';
import transformDdgData from '../transformDdgData';
import { encode } from '../visibility-codec';

import { EDdgDensity, EViewModifier } from '../types';

describe('getDerivedViewModifiers', () => {
  const hiddenLabel = 'hidden';
  const getGraph = () =>
    makeGraph(
      transformDdgData(
        testResources.wrap([
          [
            testResources.beforePayloadElem,
            testResources.simplePayloadElemMaker(hiddenLabel),
            testResources.focalPayloadElem,
            testResources.lastPayloadElem,
          ],
          [
            testResources.firstPayloadElem,
            testResources.focalPayloadElem,
            testResources.afterPayloadElem,
            testResources.midPayloadElem,
            testResources.lastPayloadElem,
          ],
        ]),
        testResources.focalPayloadElem
      ),
      true,
      EDdgDensity.OnePerLevel
    );
  const graph = getGraph();
  let hiddenKey;
  graph.vertices.forEach((_vertex, key) => {
    if (key.indexOf(hiddenLabel) !== -1) hiddenKey = key;
  });
  const visibleIndices = graph.visIdxToPathElem
    .filter(({ operation: { name } }) => name.indexOf(hiddenLabel) === -1)
    .map(({ visibilityIdx }) => visibilityIdx);
  const visEncoding = encode(visibleIndices);
  const vms = new Map(graph.visIdxToPathElem.map((_elem, idx) => [idx, EViewModifier.Emphasized]));

  it('only includes default visible vertices and edges when not given visEncoding', () => {
    let tooFarKey;
    graph.vertices.forEach((_vertex, key) => {
      if (key.indexOf(testResources.lastPayloadElem.service) !== -1) tooFarKey = key;
    });
    const { vertices } = graph.getDerivedViewModifiers(undefined, vms);

    expect(vertices.has(tooFarKey)).toBe(false);
    expect(vertices.size).toBe(graph.vertices.size - 1);
  });

  it('only includes vertices shown by given visEncoding', () => {
    const { vertices } = graph.getDerivedViewModifiers(visEncoding, vms);

    expect(vertices.has(hiddenKey)).toBe(false);
    expect(vertices.size).toBe(graph.vertices.size - 1);
  });

  it("adds pathHovered to visible vertices and edges in hovered elem's path", () => {
    const idxWithHiddenPathMember = 0;
    const { edges, vertices } = graph.getDerivedViewModifiers(
      visEncoding,
      new Map([[idxWithHiddenPathMember, EViewModifier.Hovered]])
    );
    expect(edges.size).toBe(1);
    expect(vertices.size).toBe(3);
  });

  describe('error cases', () => {
    it('errors if out of bounds visIdx has a VM', () => {
      const graphWithOutOfBoundsIdx = getGraph();
      const outOfBounds = graph.visIdxToPathElem.length;
      const outOfBoundsIndices = [...visibleIndices, outOfBounds];
      const outOfBoundsEncoding = encode(outOfBoundsIndices);
      graphWithOutOfBoundsIdx.getVisibleIndices = () => new Set(outOfBoundsIndices);
      expect(() =>
        graphWithOutOfBoundsIdx.getDerivedViewModifiers(
          outOfBoundsEncoding,
          new Map([[outOfBounds, EViewModifier.Hovered]])
        )
      ).toThrow(`Invalid vis ids: ${outOfBounds}`);
    });

    it('errors if elem with VM does not have vertex', () => {
      const graphMissingVertex = getGraph();
      const idxToDelete = graphMissingVertex.visIdxToPathElem.length - 1;
      const elemToDelete = graphMissingVertex.visIdxToPathElem[idxToDelete];
      graphMissingVertex.pathElemToVertex.delete(elemToDelete);
      expect(() =>
        graphMissingVertex.getDerivedViewModifiers(
          visEncoding,
          new Map([[idxToDelete, EViewModifier.Hovered]])
        )
      ).toThrow(`Path elem without vertex: ${elemToDelete}`);
    });
  });
});
