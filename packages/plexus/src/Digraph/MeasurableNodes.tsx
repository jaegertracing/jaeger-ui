// Copyright (c) 2019 Uber Technologies, Inc.
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

// Custom comparison function for React.memo (inverse of shouldComponentUpdate)
function arePropsEqual<T>(prevProps: TProps<T>, nextProps: TProps<T>): boolean {
  return (
    prevProps.renderNode === nextProps.renderNode &&
    prevProps.getClassName === nextProps.getClassName &&
    prevProps.layerType === nextProps.layerType &&
    prevProps.layoutVertices === nextProps.layoutVertices &&
    prevProps.nodeRefs === nextProps.nodeRefs &&
    prevProps.renderUtils === nextProps.renderUtils &&
    prevProps.vertices === nextProps.vertices &&
    isSamePropSetter(prevProps.setOnNode, nextProps.setOnNode)
  );
}

const MeasurableNodes = <T = {},>(props: TProps<T>) => {
  const { getClassName, nodeRefs, layoutVertices, renderUtils, vertices, layerType, renderNode, setOnNode } =
    props;
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

// React.memo with custom comparison replaces shouldComponentUpdate
export default React.memo(MeasurableNodes, arePropsEqual) as typeof MeasurableNodes;
