// Copyright (c) 2017 Uber Technologies, Inc.
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

import * as React from 'react';
import { ZoomTransform } from 'd3-zoom';

import { TEdge, TLayoutEdge, TLayoutGraph, TLayoutVertex, TSizeVertex, TVertex } from '../types/layout';

import LayoutManager from '../LayoutManager';

export type TObjectOfAny = { [key: string]: any };

export type TPropsFactoryFn<TInput> = (value: TInput) => TObjectOfAny | void;

export type TDirectedGraphState = {
  edges: TEdge[];
  layoutEdges: TLayoutEdge[] | void;
  layoutGraph: TLayoutGraph | void;
  layoutPhase: number;
  layoutVertices: TLayoutVertex[] | void;
  sizeVertices: TSizeVertex[] | void;
  // vertexRefs: { current: HTMLElement | null }[],
  vertexRefs: React.RefObject<HTMLElement>[];
  vertices: TVertex[];
  zoomEnabled: boolean;
  zoomTransform: ZoomTransform;
};

export type TDirectedGraphProps = {
  arrowScaleDampener: number;
  className: string;
  classNamePrefix: string;
  edges: TEdge[];
  // getEdgeLabel: ?(TEdge) => React.Node,
  getNodeLabel: ((vtx: TVertex) => React.ReactNode) | void;
  layoutManager: LayoutManager;
  minimap: boolean;
  minimapClassName: string;
  setOnEdgePath: TPropsFactoryFn<TEdge> | void;
  setOnEdgesContainer: TPropsFactoryFn<TDirectedGraphState> | void;
  setOnNode: TPropsFactoryFn<TVertex> | void;
  setOnNodesContainer: TPropsFactoryFn<TDirectedGraphState> | void;
  setOnRoot: TPropsFactoryFn<TDirectedGraphState> | void;
  vertices: TVertex[];
  zoom: boolean;
};
