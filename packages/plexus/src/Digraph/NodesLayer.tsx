// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import HtmlLayer from './HtmlLayer';
import Nodes from './Nodes';
import SvgLayer from './SvgLayer';
import { TExposedGraphState, TLayerType, TSetOnContainer, ELayerType, TNodeRenderer } from './types';

type TProps<T = {}, U = {}> = TNodeRenderer<T> &
  TSetOnContainer<T, U> & {
    getClassName: (name: string) => string;
    graphState: TExposedGraphState<T, U>;
    layerType: TLayerType;
    standalone?: boolean;
  };

const NodesLayer = <T = {}, U = {}>(props: TProps<T, U>) => {
  const { renderNode, graphState, getClassName, layerType, setOnNode } = props;
  const { layoutVertices, renderUtils } = graphState;

  if (!layoutVertices || !renderNode) {
    return null;
  }

  const LayerComponent = layerType === ELayerType.Html ? HtmlLayer : SvgLayer;

  return (
    <LayerComponent {...props} classNamePart="NodesLayer">
      <Nodes<T>
        getClassName={getClassName}
        layerType={layerType}
        layoutVertices={layoutVertices}
        renderNode={renderNode}
        renderUtils={renderUtils}
        setOnNode={setOnNode}
      />
    </LayerComponent>
  );
};

// React.memo provides shallow comparison equivalent to PureComponent
export default React.memo(NodesLayer) as typeof NodesLayer;
