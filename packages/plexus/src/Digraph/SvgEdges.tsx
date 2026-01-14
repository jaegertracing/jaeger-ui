// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import SvgEdge from './SvgEdge';
import { TRendererUtils, TSetProps, TAnyProps } from './types';
import { TLayoutEdge } from '../types';
import { isSamePropSetter } from './utils';

type TProps<T = {}> = {
  getClassName: (name: string) => string;
  layoutEdges: TLayoutEdge<T>[];
  markerEndId?: string;
  markerStartId?: string;
  renderUtils: TRendererUtils;
  setOnEdge?: TSetProps<(edge: TLayoutEdge<T>, utils: TRendererUtils) => TAnyProps | null>;
};

// Comparison function that mirrors the original shouldComponentUpdate logic
// Returns true if props are equal (no re-render needed)
function arePropsEqual<T>(prev: TProps<T>, next: TProps<T>): boolean {
  return (
    prev.getClassName === next.getClassName &&
    prev.layoutEdges === next.layoutEdges &&
    prev.markerEndId === next.markerEndId &&
    prev.markerStartId === next.markerStartId &&
    prev.renderUtils === next.renderUtils &&
    isSamePropSetter(prev.setOnEdge, next.setOnEdge)
  );
}

const SvgEdges = <T = {},>({
  getClassName,
  layoutEdges,
  markerEndId,
  markerStartId,
  renderUtils,
  setOnEdge,
}: TProps<T>) => {
  return layoutEdges.map(edge => (
    <SvgEdge
      key={`${edge.edge.from}\v${edge.edge.to}`}
      getClassName={getClassName}
      layoutEdge={edge}
      markerEndId={markerEndId}
      markerStartId={markerStartId}
      renderUtils={renderUtils}
      setOnEdge={setOnEdge}
      label={edge.edge.label}
    />
  ));
};

export default React.memo(SvgEdges, arePropsEqual) as unknown as typeof SvgEdges;
