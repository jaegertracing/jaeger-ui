// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TLayoutEdge, TLayoutGraph, TLayoutVertex, TSizeVertex } from '../../types';
import { TLayoutOptions } from '../types';

const round = Math.round;

export function getDpi(options?: TLayoutOptions | void): number {
  const DEFAULT_DPI = 72;
  const dpi = options?.dpi ?? DEFAULT_DPI;
  return dpi;
}

export function vertexToDot(v: TSizeVertex, options?: TLayoutOptions | void): TSizeVertex {
  const DPI = getDpi(options);
  // expect only width and height for going to dot
  const { vertex, height, width } = v;
  return {
    vertex,
    height: height / DPI,
    width: width / DPI,
  };
}

export function edgeToPixels(
  graph: TLayoutGraph,
  e: TLayoutEdge<{}>,
  options?: TLayoutOptions | void
): TLayoutEdge<{}> {
  const DPI = getDpi(options);
  const { height: h } = graph;
  const { edge, pathPoints } = e;
  return {
    edge,
    pathPoints:
      pathPoints && pathPoints.map<[number, number]>(pt => [round(pt[0] * DPI), round((h - pt[1]) * DPI)]),
  };
}

export function graphToPixels(graph: TLayoutGraph, options?: TLayoutOptions | void) {
  const DPI = getDpi(options);
  const { height, scale, width } = graph;
  return {
    scale,
    height: height * DPI,
    width: width * DPI,
  };
}

export function vertexToPixels(
  graph: TLayoutGraph,
  v: TLayoutVertex,
  options?: TLayoutOptions | void
): TLayoutVertex {
  const DPI = getDpi(options);
  const { height: h } = graph;
  const { vertex, height, left, top, width } = v;
  return {
    vertex,
    height: round(height * DPI),
    left: left != null ? round((left - width * 0.5) * DPI) : left,
    top: top != null ? round((h - top - height * 0.5) * DPI) : top,
    width: round(width * DPI),
  };
}
