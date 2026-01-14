// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import { TRendererUtils, TLayerType, ELayerType, TRenderNodeFn, TSetProps, TAnyProps } from './types';
import { assignMergeCss, getProps } from './utils';
import { TLayoutVertex } from '../types';

export type TProps<T = {}> = {
  getClassName: (name: string) => string;
  layerType: TLayerType;
  layoutVertex: TLayoutVertex<T>;
  renderNode: TRenderNodeFn<T>;
  renderUtils: TRendererUtils;
  setOnNode?: TSetProps<(layoutVertex: TLayoutVertex<T>, utils: TRendererUtils) => TAnyProps | null>;
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

const Node = <T = {},>({
  getClassName,
  layerType,
  renderNode,
  renderUtils,
  setOnNode,
  layoutVertex,
}: TProps<T>) => {
  const nodeContent = renderNode(layoutVertex, renderUtils);
  if (!nodeContent) {
    return null;
  }
  const { left, top } = layoutVertex;
  const props = assignMergeCss(
    {
      className: getClassName('Node'),
      style: layerType === ELayerType.Html ? getHtmlStyle(layoutVertex) : null,
      transform: layerType === ELayerType.Svg ? `translate(${left.toFixed()},${top.toFixed()})` : null,
    },
    getProps(setOnNode, layoutVertex, renderUtils)
  );
  const Wrapper = layerType === ELayerType.Html ? 'div' : 'g';
  return <Wrapper {...props}>{nodeContent}</Wrapper>;
};

// React.memo provides shallow comparison equivalent to PureComponent
export default React.memo(Node) as typeof Node;
