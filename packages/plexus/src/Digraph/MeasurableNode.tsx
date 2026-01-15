// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { forwardRef, memo, Ref, useImperativeHandle, useRef } from 'react';

import { TMeasurableNodeRenderer, TLayerType, TRendererUtils, ELayerType } from './types';
import { assignMergeCss, getProps } from './utils';
import { TLayoutVertex, TVertex } from '../types';

type TProps<T = {}> = Omit<TMeasurableNodeRenderer<T>, 'measurable' | 'measureNode'> & {
  getClassName: (name: string) => string;
  hidden: boolean;
  layerType: TLayerType;
  layoutVertex: TLayoutVertex<T> | null;
  renderUtils: TRendererUtils;
  vertex: TVertex<T>;
};

// Exposed methods via ref for parent components
export type TMeasurableNodeHandle = {
  getRef: () => {
    htmlWrapper: HTMLDivElement | null | undefined;
    svgWrapper: SVGGElement | null | undefined;
  };
  measure: () => { height: number; width: number };
};

const SVG_HIDDEN_STYLE = { visibility: 'hidden' };

const MeasurableNodeImpl = <T = {},>(props: TProps<T>, ref: Ref<TMeasurableNodeHandle>) => {
  const { getClassName, hidden, layerType, layoutVertex, renderNode, renderUtils, setOnNode, vertex } = props;

  const htmlRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGGElement>(null);

  // useImperativeHandle allows parent components to call measure() and getRef() on this component,
  // which is necessary for the layout algorithm to measure node dimensions before positioning.
  useImperativeHandle(
    ref,
    () => ({
      getRef: () => {
        if (layerType === ELayerType.Html) {
          return { htmlWrapper: htmlRef.current, svgWrapper: undefined };
        }
        return { svgWrapper: svgRef.current, htmlWrapper: undefined };
      },
      measure: () => {
        if (layerType === ELayerType.Html) {
          const current = htmlRef.current;
          if (!current) {
            return { height: 0, width: 0 };
          }
          return {
            height: current.offsetHeight,
            width: current.offsetWidth,
          };
        }
        const current = svgRef.current;
        if (!current) {
          return { height: 0, width: 0 };
        }
        const { height, width } = current.getBBox();
        return { height, width };
      },
    }),
    [layerType]
    // Note: htmlRef and svgRef are stable refs created by useRef and do not need to be in dependencies.
    // React guarantees that useRef returns the same object on every render.
  );

  if (layerType === ELayerType.Html) {
    const { height = null, left = null, top = null, width = null } = layoutVertex || {};
    const mergedProps = assignMergeCss(
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
      <div ref={htmlRef} {...mergedProps}>
        {renderNode(vertex, renderUtils, layoutVertex)}
      </div>
    );
  }

  // SVG layer
  const { left = null, top = null } = layoutVertex || {};
  const mergedProps = assignMergeCss(
    {
      className: getClassName('MeasurableSvgNode'),
      transform: left == null || top == null ? undefined : `translate(${left.toFixed()}, ${top.toFixed()})`,
      style: hidden ? SVG_HIDDEN_STYLE : null,
    },
    getProps(setOnNode, vertex, renderUtils, layoutVertex)
  );
  return (
    <g ref={svgRef} {...mergedProps}>
      {renderNode(vertex, renderUtils, layoutVertex)}
    </g>
  );
};

// forwardRef with generic type support
const MeasurableNode = forwardRef(MeasurableNodeImpl) as <T = {}>(
  props: TProps<T> & { ref?: Ref<TMeasurableNodeHandle> }
) => React.ReactElement | null;

// memo provides shallow comparison equivalent to PureComponent
export default memo(MeasurableNode) as typeof MeasurableNode;
