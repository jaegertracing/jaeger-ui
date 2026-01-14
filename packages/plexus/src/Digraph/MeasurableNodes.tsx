// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import MeasurableNode from './MeasurableNode';
import { TMeasurableNodeRenderer, TLayerType, TRendererUtils } from './types';
import { isSamePropSetter } from './utils';
import { TLayoutVertex, TVertex } from '../types';

type TProps<T = {}> = Omit<TMeasurableNodeRenderer<T>, 'measurable' | 'measureNode'> & {
  getClassName: (name: string) => string;
  layerType: TLayerType;
  layoutVertices: TLayoutVertex<T>[] | null;
  nodeRefs: React.RefObject<MeasurableNode<T>>[];
  renderUtils: TRendererUtils;
  vertices: TVertex<T>[];
};

// Comparison function that mirrors the original shouldComponentUpdate logic
function arePropsEqual<T>(prev: TProps<T>, next: TProps<T>): boolean {
  return (
    prev.renderNode === next.renderNode &&
    prev.getClassName === next.getClassName &&
    prev.layerType === next.layerType &&
    prev.layoutVertices === next.layoutVertices &&
    prev.nodeRefs === next.nodeRefs &&
    prev.renderUtils === next.renderUtils &&
    prev.vertices === next.vertices &&
    isSamePropSetter(prev.setOnNode, next.setOnNode)
  );
}

const MeasurableNodes = <T = {},>({
  getClassName,
  nodeRefs,
  layoutVertices,
  renderUtils,
  vertices,
  layerType,
  renderNode,
  setOnNode,
}: TProps<T>) => {
  return vertices.map((vertex, i) => (
    <MeasurableNode<T>
      key={vertex.key}
      getClassName={getClassName}
      ref={nodeRefs[i]}
      hidden={!layoutVertices}
      layerType={layerType}
      renderNode={renderNode}
      renderUtils={renderUtils}
      vertex={vertex}
      layoutVertex={layoutVertices && layoutVertices[i]}
      setOnNode={setOnNode}
    />
  ));
};

export default React.memo(MeasurableNodes, arePropsEqual) as unknown as typeof MeasurableNodes;
