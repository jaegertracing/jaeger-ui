// Copyright (c) 2019 Uber Technologies, Inc.
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

// Custom comparison function for React.memo (inverse of shouldComponentUpdate)
function arePropsEqual<T>(prevProps: TProps<T>, nextProps: TProps<T>): boolean {
  return (
    prevProps.getClassName === nextProps.getClassName &&
    prevProps.layoutEdges === nextProps.layoutEdges &&
    prevProps.markerEndId === nextProps.markerEndId &&
    prevProps.markerStartId === nextProps.markerStartId &&
    prevProps.renderUtils === nextProps.renderUtils &&
    isSamePropSetter(prevProps.setOnEdge, nextProps.setOnEdge)
  );
}

const SvgEdges = <T = {},>(props: TProps<T>) => {
  const { getClassName, layoutEdges, markerEndId, markerStartId, renderUtils, setOnEdge } = props;
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

// React.memo with custom comparison replaces shouldComponentUpdate
export default React.memo(SvgEdges, arePropsEqual) as typeof SvgEdges;
