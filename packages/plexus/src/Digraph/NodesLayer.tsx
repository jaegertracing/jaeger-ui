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

import HtmlLayer from './HtmlLayer';
import Node from './Node';
import SvgLayer from './SvgLayer';
import { TExposedGraphState, TNodeRenderer, TLayerType, TSetOnContainer, ELayerType } from './types';

type TProps<T = {}, U = {}> = TNodeRenderer<T> &
  TSetOnContainer<T, U> & {
    getClassName: (name: string) => string;
    graphState: TExposedGraphState<T, U>;
    layerType: TLayerType;
    standalone?: boolean;
  };

export default class NodesLayer<T = {}, U = {}> extends React.PureComponent<TProps<T, U>> {
  render() {
    const { layoutVertices } = this.props.graphState;
    if (!layoutVertices) {
      return null;
    }
    const {
      getClassName,
      graphState: { renderUtils },
      layerType,
      renderNode,
      setOnNode,
    } = this.props;
    const LayerComponent = layerType === ELayerType.Html ? HtmlLayer : SvgLayer;
    return (
      <LayerComponent {...this.props} classNamePart="NodesLayer">
        {layoutVertices.map(lv => (
          <Node
            key={lv.vertex.key}
            getClassName={getClassName}
            layerType={layerType}
            layoutVertex={lv}
            renderNode={renderNode}
            renderUtils={renderUtils}
            setOnNode={setOnNode}
          />
        ))}
      </LayerComponent>
    );
  }
}
