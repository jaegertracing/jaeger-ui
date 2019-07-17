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
import { TOneOfFour, TOneOfTwo } from '../types/TOneOf';
import { ZoomTransform } from '../ZoomManager';

export enum ELayoutPhase {
  NoData = 'NoData',
  CalcSizes = 'CalcSizes',
  CalcPositions = 'CalcPositions',
  CalcEdges = 'CalcEdges',
  Done = 'Done',
}

export type TLayerType = 'html' | 'svg';
export enum ELayerType {
  Html = 'html',
  Svg = 'svg',
}

export type TRendererUtils = {
  getLocalId: (name: string) => string;
  getZoomTransform: () => ZoomTransform;
};

export type TExposedGraphState<T = {}, U = {}> = {
  edges: TEdge<U>[];
  layoutEdges: TLayoutEdge<U>[] | null;
  layoutGraph: TLayoutGraph | null;
  layoutPhase: ELayoutPhase;
  layoutVertices: TLayoutVertex<T>[] | null;
  renderUtils: TRendererUtils;
  vertices: TVertex<T>[];
  zoomTransform: ZoomTransform;
};

export type TAnyProps = Record<string, unknown> & {
  className?: string;
  style?: React.CSSProperties;
};

export type TPropFactoryFn = (...args: any[]) => TAnyProps | null;

export type TSetProps<TFactoryFn extends TPropFactoryFn> =
  | TAnyProps
  | TFactoryFn
  | (TAnyProps | TFactoryFn)[];

export type TFromGraphStateFn<T = {}, U = {}> = (input: TExposedGraphState<T, U>) => TAnyProps | null;

export type TPropsFactory<PropNames extends string, FactoryFn extends TPropFactoryFn> = {
  [K in PropNames]?: TSetProps<FactoryFn>;
};

export type TSetOnContainer<T = {}, U = {}> = TPropsFactory<'setOnContainer', TFromGraphStateFn<T, U>>;

type TKeyed = { key: string };

export type TNodeRenderFn<T = {}> = (vertex: TVertex<T>, utils: TRendererUtils) => React.ReactNode;

export type TMeasurableNodeRenderFn<T = {}> = (
  vertex: TVertex<T>,
  utils: TRendererUtils,
  layoutVertex: TLayoutVertex<T> | null
) => React.ReactNode;

export type TMeasurableNodeRenderer<T = {}> = {
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
  TOneOfTwo<TNodeRenderer<T>, TMeasurableNodeRenderer<T>> &
  TSetOnContainer<T, U>;

type TStandaloneNodesLayer<T = {}, U = {}> = TNodesLayer<T, U> & {
  layerType: TLayerType;
};

type TMarkerDef<T = {}, U = {}> = TKeyed & {
  type: React.Component;
  localId: string;
  setOnMarker?: TSetProps<TFromGraphStateFn<T, U>>;
};

type TEdgesLayer<T = {}, U = {}> = TKeyed &
  TSetOnContainer<T, U> & {
    edges: true;
    setOnEdge?: TSetProps<(edges: TLayoutEdge<U>, utils: TRendererUtils) => TAnyProps | null>;
  };

type TStandaloneEdgesLayer<T = {}, U = {}> = TEdgesLayer<T, U> & {
  layerType: TLayerType;
  defs?: TMarkerDef<T, U>[];
};

export type THtmlLayersGroup<T = {}, U = {}> = TKeyed &
  TSetOnContainer<T, U> & {
    layerType: Extract<TLayerType, 'html'>;
    layers: TOneOfTwo<TNodesLayer<T, U>, TEdgesLayer<T, U>>[];
  };

type TSvgLayersGroup<T = {}, U = {}> = TKeyed &
  TSetOnContainer<T, U> & {
    layerType: Extract<TLayerType, 'svg'>;
    defs?: TMarkerDef<T, U>[];
    layers: TOneOfTwo<TNodesLayer<T, U>, TEdgesLayer<T, U>>[];
  };

export type TLayer<T = {}, U = {}> = TOneOfFour<
  THtmlLayersGroup<T, U>,
  TSvgLayersGroup<T, U>,
  TStandaloneNodesLayer<T, U>,
  TStandaloneEdgesLayer<T, U>
>;

export type TMeasurableNodeProps<T = {}> = Omit<TMeasurableNodeRenderer<T>, 'measurable'> & {
  classNamePrefix?: string;
  hidden?: boolean;
  layoutVertex: TLayoutVertex<T> | null;
  renderUtils: TRendererUtils;
  vertex: TVertex<T>;
};
