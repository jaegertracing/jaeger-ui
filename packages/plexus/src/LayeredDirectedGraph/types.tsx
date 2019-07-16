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

import * as React from 'react';

import { TEdge, TLayoutEdge, TLayoutGraph, TLayoutVertex, TVertex } from '../types';
import TOneOf from '../types/TOneOf';
import { ZoomTransform } from '../ZoomManager';

export enum ELayoutPhase {
  NoData = 'NoData',
  CalcSizes = 'CalcSizes',
  CalcPositions = 'CalcPositions',
  CalcEdges = 'CalcEdges',
  Done = 'Done',
}

export type TAnyProps = Record<string, unknown> & {
  className?: string;
  style?: React.CSSProperties;
};

export type TPropFactoryFn = (...args: any[]) => TAnyProps | null;

export type TSetProps<TFactoryFn extends TPropFactoryFn> =
  | TAnyProps
  | TFactoryFn
  | (TAnyProps | TFactoryFn)[];

// TODO(joe): consider getting rid of this type
// type TAesthetics = {
//   className?: string;
//   style?: React.CSSProperties;
// };

export type TRendererUtils = {
  getLocalId: (name: string) => string;
  getZoomTransform: () => ZoomTransform;
};

export type TExposedGraphState<T = {}, U = {}> = {
  edges: TEdge<U>[];
  zoomTransform: ZoomTransform;
  layoutEdges: TLayoutEdge<U>[] | null;
  layoutGraph: TLayoutGraph | null;
  layoutPhase: ELayoutPhase;
  layoutVertices: TLayoutVertex<T>[] | null;
  renderUtils: TRendererUtils;
  vertices: TVertex<T>[];
};

export type TFromGraphStateFn<T = {}, U = {}> = (input: TExposedGraphState<T, U>) => TAnyProps | null;

export type TSetOnContainer<T = {}, U = {}> = {
  setOnContainer?: TSetProps<TFromGraphStateFn<T, U>>;
};

type TKeyed = { key: string };

type TElemType = TOneOf<{ html: true }, { svg: true }>;

export type TNodeRenderFn<T = {}> = (vertex: TVertex<T>, utils: TRendererUtils) => React.ReactNode;

export type TMeasurableNodeRenderFn<T = {}> = (
  vertex: TVertex<T>,
  utils: TRendererUtils,
  layoutVertex: TLayoutVertex<T> | null
) => React.ReactNode;

type TMeasurableNodeRenderer<T = {}> = {
  measurable: true;
  nodeRender: TMeasurableNodeRenderFn<T>;
  setOnNode?: TSetProps<
    (vertex: TVertex<T>, utils: TRendererUtils, layoutVertex: TLayoutVertex<T> | null) => TAnyProps | null
  >;
};

type TNodeRenderer<T = {}> = {
  nodeRender: TNodeRenderFn<T>;
  setOnNode?: TSetProps<(layoutVertex: TLayoutVertex<T>, utils: TRendererUtils) => TAnyProps | null>;
};

type TNodesLayer<T = {}, U = {}> = TKeyed &
  TOneOf<TNodeRenderer<T>, TMeasurableNodeRenderer<T>> &
  TSetOnContainer<T, U>;

type TStandaloneNodesLayer<T = {}, U = {}> = TNodesLayer<T, U> & TElemType;

type TEdgesLayer<T = {}, U = {}> = TKeyed &
  TSetOnContainer<T, U> & {
    edges: true;
    setOnEdge?: TSetProps<(edges: TLayoutEdge<U>, utils: TRendererUtils) => TAnyProps | null>;
  };

type TStandaloneEdgesLayer<T = {}, U = {}> = TEdgesLayer<T, U> & TElemType;

type THtmlLayersGroup<T = {}, U = {}> = TKeyed &
  TSetOnContainer<T, U> & {
    html: true;
    layers: (TNodesLayer<T, U> | TEdgesLayer<T, U>)[];
  };

type TMarkerDef<T = {}, U = {}> = TKeyed & {
  type: React.Component;
  localId: string;
  setOnMarker?: TSetProps<TFromGraphStateFn<T, U>>;
};

type TSvgLayersGroup<T = {}, U = {}> = TKeyed &
  TSetOnContainer<T, U> & {
    svg: true;
    defs?: TMarkerDef<T, U>[];
    layers: (TNodesLayer<T, U> | TEdgesLayer<T, U>)[];
  };

export type TLayer<T = {}, U = {}> = TOneOf<
  THtmlLayersGroup<T, U>,
  TSvgLayersGroup<T, U>,
  TStandaloneNodesLayer<T, U>,
  TStandaloneEdgesLayer<T, U>
>;
