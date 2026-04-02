// Copyright (c) 2026 The Jaeger Authors.
// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { forwardRef, memo, Ref, ReactElement, useCallback, useImperativeHandle, useRef } from 'react';

import { TMeasurableNodeRenderer, TLayerType, TRendererUtils, ELayerType } from './types';
import { assignMergeCss, getProps } from './utils';
import { TLayoutVertex, TVertex } from '../types';
import { TOneOfTwo } from '../types/TOneOf';

type TProps<T = {}> = Omit<TMeasurableNodeRenderer<T>, 'measurable' | 'measureNode'> & {
  getClassName: (name: string) => string;
  hidden: boolean;
  layerType: TLayerType;
  layoutVertex: TLayoutVertex<T> | null;
  renderUtils: TRendererUtils;
  vertex: TVertex<T>;
};

// 透過 ref 暴露的公開介面
export interface MeasurableNodeRef {
  measure: () => { height: number; width: number };
  getRef: () => TOneOfTwo<{ htmlWrapper: HTMLDivElement | null }, { svgWrapper: SVGGElement | null }>;
}

const SVG_HIDDEN_STYLE = { visibility: 'hidden' };

const MeasurableNodeInner = <T = {}>(
  { getClassName, hidden, layerType, layoutVertex, renderNode, renderUtils, setOnNode, vertex }: TProps<T>,
  ref: Ref<MeasurableNodeRef>
) => {
  const htmlRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGGElement>(null);

  const measureHtml = useCallback(() => {
    const current = htmlRef.current;
    if (!current) {
      return { height: 0, width: 0 };
    }
    return {
      height: current.offsetHeight,
      width: current.offsetWidth,
    };
  }, []);

  const measureSvg = useCallback(() => {
    const current = svgRef.current;
    if (!current) {
      return { height: 0, width: 0 };
    }
    const { height, width } = current.getBBox();
    return { height, width };
  }, []);

  // 佈局演算法需要透過 ref 呼叫 measure() 來取得節點尺寸，再進行定位
  useImperativeHandle(
    ref,
    () => ({
      measure: () => (layerType === ELayerType.Html ? measureHtml() : measureSvg()),
      getRef: (): TOneOfTwo<{ htmlWrapper: HTMLDivElement | null }, { svgWrapper: SVGGElement | null }> => {
        if (layerType === ELayerType.Html) {
          return { htmlWrapper: htmlRef.current };
        }
        return { svgWrapper: svgRef.current };
      },
    }),
    [layerType, measureHtml, measureSvg]
  );

  if (layerType === ELayerType.Html) {
    const { height = null, left = null, top = null, width = null } = layoutVertex || {};
    const props = assignMergeCss(
      {
        className: getClassName('MeasurableHtmlNode'),
        style: {
          height,
          width,
          boxSizing: 'border-box',
          position: 'absolute',
          transform:
            left == null || top == null ? undefined : `translate(${left.toFixed()}px,${top.toFixed()}px)`,
          visibility: hidden ? 'hidden' : undefined,
        },
      },
      getProps(setOnNode, vertex, renderUtils, layoutVertex)
    );
    return (
      <div ref={htmlRef} {...props}>
        {renderNode(vertex, renderUtils, layoutVertex)}
      </div>
    );
  }

  const { left = null, top = null } = layoutVertex || {};
  const props = assignMergeCss(
    {
      className: getClassName('MeasurableSvgNode'),
      transform: left == null || top == null ? undefined : `translate(${left.toFixed()}, ${top.toFixed()})`,
      style: hidden ? SVG_HIDDEN_STYLE : null,
    },
    getProps(setOnNode, vertex, renderUtils, layoutVertex)
  );
  return (
    <g ref={svgRef} {...props}>
      {renderNode(vertex, renderUtils, layoutVertex)}
    </g>
  );
};

// forwardRef 讓父元件可以掛 ref，memo 提供淺比較（等同原本的 PureComponent）
const MeasurableNode = memo(forwardRef(MeasurableNodeInner)) as <T = {}>(
  props: TProps<T> & { ref?: Ref<MeasurableNodeRef> }
) => ReactElement | null;

export default MeasurableNode;
