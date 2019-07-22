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

import MeasurableNodesLayer from './MeasurableNodesLayer';
import { TExposedGraphState, THtmlLayersGroup, ELayerType } from './types';
import { assignMergeCss, getProps } from './utils';
import { TSizeVertex } from '../types';
import ZoomManager from '../ZoomManager';

type TProps<T = {}, U = {}> = Omit<THtmlLayersGroup<T, U>, 'layerType' | 'key'> & {
  classNamePrefix?: string;
  graphState: TExposedGraphState<T, U>;
  setSizeVertices: (senderKey: string, sizeVertices: TSizeVertex<T>[]) => void;
};

export default class HtmlLayersGroup<T = {}, U = {}> extends React.PureComponent<TProps<T, U>> {
  private renderLayers() {
    const { classNamePrefix, layers, graphState, setSizeVertices } = this.props;
    return layers.map(layer => {
      if (layer.nodeRender && layer.measurable) {
        const { key, setOnContainer, setOnNode, nodeRender } = layer;
        return (
          <MeasurableNodesLayer<T, U>
            key={key}
            classNamePrefix={classNamePrefix}
            graphState={graphState}
            layerType={ELayerType.Html}
            nodeRender={nodeRender}
            senderKey={key}
            setOnContainer={setOnContainer}
            setOnNode={setOnNode}
            setSizeVertices={setSizeVertices}
          />
        );
      }
      throw new Error('Not implemented');
    });
  }

  render() {
    const { classNamePrefix, graphState, setOnContainer } = this.props;
    const { zoomTransform } = graphState;
    const containerProps = assignMergeCss(getProps(setOnContainer, graphState), {
      style: {
        ...ZoomManager.getZoomStyle(zoomTransform),
        position: 'absolute',
        top: 0,
        left: 0,
      },
      className: `${classNamePrefix} ${classNamePrefix}-LayeredDigraph--HtmlLayersGroup`,
    });
    return <div {...containerProps}>{this.renderLayers()}</div>;
  }
}
