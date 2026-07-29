// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { TLayoutEdge, TLayoutGraph, TLayoutVertex, TSizeVertex } from '../../types';
import { edgeToPixels, graphToPixels, vertexToDot, vertexToPixels } from './conv-coord';

describe('conv-coord', () => {
  describe('vertexToDot', () => {
    it('converts vertex dimensions to dot units using default DPI', () => {
      const input: TSizeVertex<{}> = {
        vertex: { key: 'a' },
        height: 144,
        width: 216,
      };

      expect(vertexToDot(input)).toEqual({
        vertex: { key: 'a' },
        height: 2,
        width: 3,
      });
    });

    it('uses custom DPI when provided', () => {
      const input: TSizeVertex<{}> = {
        vertex: { key: 'a' },
        height: 144,
        width: 216,
      };

      expect(vertexToDot(input, { dpi: 36 })).toEqual({
        vertex: { key: 'a' },
        height: 4,
        width: 6,
      });
    });
  });

  describe('graphToPixels', () => {
    it('converts graph dimensions to pixels while preserving scale', () => {
      const graph: TLayoutGraph = {
        height: 5,
        width: 10,
        scale: 1.25,
      };

      expect(graphToPixels(graph)).toEqual({
        height: 360,
        width: 720,
        scale: 1.25,
      });
    });
  });

  describe('edgeToPixels', () => {
    const graph: TLayoutGraph = {
      height: 10,
      width: 10,
      scale: 1,
    };

    it('converts edge path points to pixel coordinates', () => {
      const edge: TLayoutEdge<{}> = {
        edge: { from: 'a', to: 'b' },
        pathPoints: [
          [1, 2],
          [3, 4],
        ],
      };

      expect(edgeToPixels(graph, edge)).toEqual({
        edge: { from: 'a', to: 'b' },
        pathPoints: [
          [72, 576],
          [216, 432],
        ],
      });
    });

    it('preserves undefined pathPoints', () => {
      const edge = {
        edge: { from: 'a', to: 'b' },
        pathPoints: undefined,
      } as unknown as TLayoutEdge<{}>;

      expect(edgeToPixels(graph, edge)).toEqual({
        edge: { from: 'a', to: 'b' },
        pathPoints: undefined,
      });
    });

    it('preserves empty pathPoints arrays', () => {
      const edge: TLayoutEdge<{}> = {
        edge: { from: 'a', to: 'b' },
        pathPoints: [],
      };

      expect(edgeToPixels(graph, edge)).toEqual({
        edge: { from: 'a', to: 'b' },
        pathPoints: [],
      });
    });
  });

  describe('vertexToPixels', () => {
    const graph: TLayoutGraph = {
      height: 10,
      width: 10,
      scale: 1,
    };

    it('converts vertex coordinates and size to pixels', () => {
      const vertex: TLayoutVertex = {
        vertex: { key: 'n1' },
        height: 2,
        width: 3,
        left: 4,
        top: 5,
      };

      expect(vertexToPixels(graph, vertex)).toEqual({
        vertex: { key: 'n1' },
        height: 144,
        width: 216,
        left: 180,
        top: 288,
      });
    });

    it('transforms zero coordinates instead of treating them as nullish', () => {
      const vertex: TLayoutVertex = {
        vertex: { key: 'n1' },
        height: 2,
        width: 3,
        left: 0,
        top: 0,
      };

      expect(vertexToPixels(graph, vertex)).toEqual({
        vertex: { key: 'n1' },
        height: 144,
        width: 216,
        left: -108,
        top: 648,
      });
    });

    it('preserves null coordinates', () => {
      const vertex = {
        vertex: { key: 'n1' },
        height: 2,
        width: 3,
        left: null,
        top: null,
      } as unknown as TLayoutVertex;

      expect(vertexToPixels(graph, vertex)).toEqual({
        vertex: { key: 'n1' },
        height: 144,
        width: 216,
        left: null,
        top: null,
      });
    });
  });
});
