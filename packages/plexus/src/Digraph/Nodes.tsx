// Copyright (c) 2026 The Jaeger Authors
// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import Node from './Node';
import { TLayerType, TNodeRenderer, TRendererUtils } from './types';
import { TLayoutVertex } from '../types';

type TProps<T = {}> = TNodeRenderer<T> & {
  getClassName: (name: string) => string;
  layerType: TLayerType;
  layoutVertices: TLayoutVertex<T>[];
  renderNode: NonNullable<TNodeRenderer<T>['renderNode']>;
  renderUtils: TRendererUtils;
};

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

// Double cast via `unknown` is needed because Nodes is generic;
// React.memo does not preserve the generic signature.
export default React.memo(Nodes) as unknown as typeof Nodes;
