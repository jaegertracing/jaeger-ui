// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2019 Uber Technologies, Inc.
// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import Node from './Node';
import { TLayerType, TNodeRenderer, TRendererUtils } from './types';
import { TLayoutVertex } from '../types';
import { isSamePropSetter } from './utils';

type TProps<T = {}> = TNodeRenderer<T> & {
  getClassName: (name: string) => string;
  layerType: TLayerType;
  layoutVertices: TLayoutVertex<T>[];
  renderNode: NonNullable<TNodeRenderer<T>['renderNode']>;
  renderUtils: TRendererUtils;
};

// Custom comparator for React.memo because setOnNode can be an array,
// which requires element-wise comparison via isSamePropSetter.
export function arePropsEqual<T>(prev: TProps<T>, next: TProps<T>): boolean {
  return (
    prev.renderNode === next.renderNode &&
    prev.getClassName === next.getClassName &&
    prev.layerType === next.layerType &&
    prev.layoutVertices === next.layoutVertices &&
    prev.renderUtils === next.renderUtils &&
    isSamePropSetter(prev.setOnNode, next.setOnNode)
  );
}

function Nodes<T = {}>({
  getClassName,
  layoutVertices,
  renderUtils,
  layerType,
  renderNode,
  setOnNode,
}: TProps<T>) {
  return layoutVertices.map(lv => (
    <Node
      key={lv.vertex.key}
      getClassName={getClassName}
      layerType={layerType}
      layoutVertex={lv}
      renderNode={renderNode}
      renderUtils={renderUtils}
      setOnNode={setOnNode}
    />
  ));
}

export default React.memo(Nodes, arePropsEqual) as unknown as typeof Nodes;
