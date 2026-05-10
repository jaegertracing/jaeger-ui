// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import NodesLayer from './NodesLayer';
import SvgEdgesLayer from './SvgEdgesLayer';
import SvgLayer from './SvgLayer';
import { TExposedGraphState, TSvgLayersGroup, ELayerType } from './types';

type TProps<T = {}, U = {}> = Omit<TSvgLayersGroup<T, U>, 'layerType' | 'key'> & {
  getClassName: (name: string) => string;
  graphState: TExposedGraphState<T, U>;
};

const SvgLayersGroup = <T = {}, U = {}>(props: TProps<T, U>) => {
  const { getClassName, layers, graphState } = props;

  const renderedLayers = layers.map(layer => {
    const { key, setOnContainer } = layer;
    if (layer.edges) {
      return (
        <SvgEdgesLayer<T, U>
          key={key}
          getClassName={getClassName}
          graphState={graphState}
          markerEndId={layer.markerEndId}
          markerStartId={layer.markerStartId}
          setOnContainer={setOnContainer}
          setOnEdge={layer.setOnEdge}
        />
      );
    }
    if (layer.measurable) {
      // measurable nodes layer
      throw new Error('Not implemented');
    }
    return (
      <NodesLayer<T, U>
        key={key}
        getClassName={getClassName}
        graphState={graphState}
        layerType={ELayerType.Svg}
        renderNode={layer.renderNode}
        setOnContainer={setOnContainer}
        setOnNode={layer.setOnNode}
      />
    );
  });

  return (
    <SvgLayer topLayer {...props} classNamePart="SvgLayersGroup">
      {renderedLayers}
    </SvgLayer>
  );
};

// React.memo provides shallow comparison equivalent to PureComponent
export default React.memo(SvgLayersGroup) as typeof SvgLayersGroup;
