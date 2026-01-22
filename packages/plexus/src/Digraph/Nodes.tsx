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

function NodesImpl<T = {}>(props: TProps<T>): React.ReactElement[] {
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
}

// React.memo with custom comparison replaces shouldComponentUpdate
// Use generic function type to preserve type parameters
type TNodesComponent = <T = {}>(props: TProps<T>) => React.ReactElement[];

const Nodes: TNodesComponent = React.memo(NodesImpl, arePropsEqual) as unknown as TNodesComponent;

export default Nodes;
