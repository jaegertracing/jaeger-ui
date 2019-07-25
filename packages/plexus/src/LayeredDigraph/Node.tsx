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

import { TNodeRenderer, TRendererUtils, TLayerType, ELayerType } from './types';
import { assignMergeCss, getProps } from './utils';
import { TLayoutVertex } from '../types';

export type TProps<T = {}> = TNodeRenderer<T> & {
  getClassName: (name: string) => string;
  layoutVertex: TLayoutVertex<T>;
  renderUtils: TRendererUtils;
  layerType: TLayerType;
};

function getHtmlStyle(lv: TLayoutVertex<any>) {
  const { height, left, top, width } = lv;
  return {
    height,
    width,
    position: 'absolute',
    transform: left == null || top == null ? undefined : `translate(${left.toFixed()}px,${top.toFixed()}px)`,
  };
}

export default class Node<T = {}> extends React.PureComponent<TProps<T>> {
  render() {
    const { getClassName, layerType, nodeRender, renderUtils, setOnNode, layoutVertex } = this.props;
    const { left, top } = layoutVertex;
    const props = assignMergeCss(getProps(setOnNode, layoutVertex, renderUtils), {
      className: getClassName('Node'),
      style: layerType === ELayerType.Html ? getHtmlStyle(layoutVertex) : null,
      transform: layerType === ELayerType.Svg ? `translate(${left.toFixed()},${top.toFixed()})` : null,
    });
    const Wrapper = layerType === ELayerType.Html ? 'div' : 'g';
    return <Wrapper {...props}>{nodeRender(layoutVertex, renderUtils)}</Wrapper>;
  }
}
