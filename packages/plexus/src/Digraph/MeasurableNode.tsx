// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { forwardRef, memo, useCallback, useImperativeHandle, useRef } from 'react';

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

// Public interface exposed via ref
export interface MeasurableNodeRef {
  measure: () => { height: number; width: number };
  getRef: () => TOneOfTwo<{ htmlWrapper: HTMLDivElement | null }, { svgWrapper: SVGGElement | null }>;
}

const SVG_HIDDEN_STYLE = { visibility: 'hidden' };

const MeasurableNodeInner = <T = {},>(
  { getClassName, hidden, layerType, layoutVertex, renderNode, renderUtils, setOnNode, vertex }: TProps<T>,
  ref: React.Ref<MeasurableNodeRef>
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

  // useImperativeHandle allows parent components to call measure() and getRef() on this component,
  // which is necessary for the layout algorithm to measure node dimensions before positioning.
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

  // SVG layer type
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

// forwardRef allows parent components to attach refs to this component
// memo provides shallow prop comparison similar to the original PureComponent
const MeasurableNode = memo(forwardRef(MeasurableNodeInner)) as <T = {}>(
  props: TProps<T> & { ref?: React.Ref<MeasurableNodeRef> }
) => React.ReactElement | null;

export default MeasurableNode;
