// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import SvgEdges from './SvgEdges';
import SvgLayer from './SvgLayer';
import { TExposedGraphState, TStandaloneEdgesLayer } from './types';

type TProps<T = {}, U = {}> = Omit<TStandaloneEdgesLayer<T, U>, 'edges' | 'layerType' | 'key'> & {
  getClassName: (name: string) => string;
  graphState: TExposedGraphState<T, U>;
  standalone?: boolean;
};

// Add the default black stroke on an outer <g> so CSS classes or styles
// on the inner <g> can override it
// TODO: A more configurable approach to setting a default stroke color
const INHERIT_STROKE = { stroke: '#000' };

const SvgEdgesLayer = <T = {}, U = {}>(props: TProps<T, U>) => {
  const { getClassName, graphState, markerEndId, markerStartId, setOnEdge } = props;
  const { layoutEdges, renderUtils } = graphState;

  if (!layoutEdges) {
    return null;
  }

  return (
    <SvgLayer {...props} classNamePart="SvgEdgesLayer" extraWrapper={INHERIT_STROKE}>
      <SvgEdges
        getClassName={getClassName}
        layoutEdges={layoutEdges}
        markerEndId={markerEndId}
        markerStartId={markerStartId}
        renderUtils={renderUtils}
        setOnEdge={setOnEdge}
      />
    </SvgLayer>
  );
};

// React.memo provides shallow comparison equivalent to PureComponent
export default React.memo(SvgEdgesLayer) as typeof SvgEdgesLayer;
