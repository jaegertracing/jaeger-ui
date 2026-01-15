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

// Custom comparison function for React.memo (inverse of shouldComponentUpdate)
function arePropsEqual<T>(prevProps: TProps<T>, nextProps: TProps<T>): boolean {
  return (
    prevProps.renderNode === nextProps.renderNode &&
    prevProps.getClassName === nextProps.getClassName &&
    prevProps.layerType === nextProps.layerType &&
    prevProps.layoutVertices === nextProps.layoutVertices &&
    prevProps.renderUtils === nextProps.renderUtils &&
    isSamePropSetter(prevProps.setOnNode, nextProps.setOnNode)
  );
}

const Nodes = <T = {},>(props: TProps<T>) => {
  const { getClassName, layoutVertices, renderUtils, layerType, renderNode, setOnNode } = props;
  return layoutVertices.map(
    (lv): React.ReactElement => (
      <Node
        key={lv.vertex.key}
        getClassName={getClassName}
        layerType={layerType}
        layoutVertex={lv}
        renderNode={renderNode}
        renderUtils={renderUtils}
        setOnNode={setOnNode}
      />
    )
  );
};

// React.memo with custom comparison replaces shouldComponentUpdate
export default React.memo(Nodes, arePropsEqual) as typeof Nodes;
