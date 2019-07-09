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

import { THtmlScopeProps } from './HtmlScope';
import MeasurableNodesLayer from './MeasurableNodesLayer';
import MeasurableNodesLayerInternal from './MeasurableNodesLayerInternal';
import { TRendererUtils, ELayoutPhase } from './types';
import { isReactElement } from './utils';
import { mergeClassNameAndStyle } from '../DirectedGraph/prop-factories/mergePropSetters';
import { TEdge, TLayoutEdge, TLayoutVertex, TSizeVertex, TVertex, TLayoutGraph } from '../types';
import ZoomManager, { ZoomTransform } from '../ZoomManager';

type THtmlScopeInternalProps<T = {}, U = {}> = THtmlScopeProps & {
  classNamePrefix: string;
  edges: TEdge<U>[];
  layoutEdges: TLayoutEdge<U>[] | null;
  layoutGraph: TLayoutGraph | null;
  layoutPhase: ELayoutPhase;
  layoutVertices: TLayoutVertex<T>[] | null;
  renderUtils: TRendererUtils;
  setSizeVertices: (sizeVertices: TSizeVertex<T>[]) => void;
  vertices: TVertex<T>[];
  zoomTransform: ZoomTransform;
};

export default class HtmlScopeInternal<T = {}, U = {}> extends React.PureComponent<
  THtmlScopeInternalProps<T, U>
> {
  props!: THtmlScopeInternalProps<T, U>;

  render() {
    const {
      classNamePrefix,
      layoutGraph,
      layoutPhase,
      layoutVertices,
      renderUtils,
      setOnContainer,
      setSizeVertices,
      vertices,
    } = this.props;

    const containerProps = mergeClassNameAndStyle((setOnContainer && setOnContainer(this.props)) || {}, {
      style: {
        ...ZoomManager.getZoomStyle(renderUtils.getZoomTransform()),
        position: 'absolute',
        top: 0,
        left: 0,
      },
      className: `${classNamePrefix} ${classNamePrefix}-LayeredDirectedGraph--HtmlScope`,
    });
    const children = React.Children.map(this.props.children, child => {
      if (!isReactElement(child)) {
        return child;
      }
      if (child.type !== MeasurableNodesLayer) {
        return child;
      }
      const props = {
        ...child.props,
        classNamePrefix,
        layoutGraph,
        layoutPhase,
        layoutVertices,
        vertices,
        renderUtils,
        setSizeVertices,
      };
      return <MeasurableNodesLayerInternal {...props} isHtml />;
    });
    return <div {...containerProps}>{children}</div>;
  }
}
