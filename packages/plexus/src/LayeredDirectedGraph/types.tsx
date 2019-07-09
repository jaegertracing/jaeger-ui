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

// import * as React from 'react';
// import { ZoomTransform } from 'd3-zoom';

// import LayoutManager from '../LayoutManager';
// import { TEdge, TLayoutEdge, TLayoutGraph, TLayoutVertex, TSizeVertex, TVertex } from '../types';
import { TEdge, TLayoutEdge, TLayoutGraph, TLayoutVertex, TVertex } from '../types';
import { ZoomTransform } from '../ZoomManager';

export type TODO = 'TODO';

export enum ELayoutPhase {
  NoData = 'NoData',
  CalcSizes = 'CalcSizes',
  CalcPositions = 'CalcPositions',
  CalcEdges = 'CalcEdges',
  Done = 'Done',
}

// export enum EContainerType {
//   Html = 'Html',
//   Svg = 'Svg',
// }

export type TRendererUtils = {
  getLocalId: (name: string) => string;
  getZoomTransform: () => ZoomTransform;
};

export type TMeasurableNodeRenderer<T = {}> = (
  vertex: TVertex<T>,
  utils: TRendererUtils,
  layoutVertex: TLayoutVertex<T> | null
) => React.ReactNode;

type TContainerPropsFactoryInput<T = {}, U = {}> = {
  edges: TEdge<U>[];
  zoomTransform: ZoomTransform;
  layoutEdges: TLayoutEdge<U>[] | null;
  layoutGraph: TLayoutGraph | null;
  layoutPhase: ELayoutPhase;
  layoutVertices: TLayoutVertex<T>[] | null;
  renderUtils: TRendererUtils;
  vertices: TVertex<T>[];
};

export type TContainerPropsFactoryFn<T = {}, U = {}> = (
  input: TContainerPropsFactoryInput<T, U>
) => Record<string, unknown> | null;

type TNodesContainerPropsFactoryInput<T = {}> = {
  layoutGraph: TLayoutGraph | null;
  layoutPhase: ELayoutPhase;
  layoutVertices: TLayoutVertex<T>[] | null;
  renderUtils: TRendererUtils;
  vertices: TVertex<T>[];
};

export type TNodesContainerPropsFactoryFn<T = {}> = (
  input: TNodesContainerPropsFactoryInput<T>
) => Record<string, unknown> | null;

export type TMeasurableNodeProps<T = {}> = Record<string, any> & {
  children?: void;
  classNamePrefix: string;
  hidden?: boolean;
  layoutVertex: TLayoutVertex<T> | null;
  render: TMeasurableNodeRenderer<T>;
  renderUtils: TRendererUtils;
  vertex: TVertex<T>;
};
