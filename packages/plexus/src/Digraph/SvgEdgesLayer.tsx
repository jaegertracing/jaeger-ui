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

// Apply the default stroke on the outer <g> so that CSS classes or styles on the
// inner <g> can still override it per-edge. We use `currentColor` here instead of
// a hardcoded color — it inherits the CSS `color` property from the nearest ancestor
// that sets it, which Ant Design's theme engine handles correctly for both light and
// dark modes (avoiding the invisible-black-on-dark-background bug).
const DEFAULT_STROKE_STYLE = { stroke: 'currentColor' };

const SvgEdgesLayer = <T = {}, U = {}>(props: TProps<T, U>) => {
  const { getClassName, graphState, markerEndId, markerStartId, setOnEdge } = props;
  const { layoutEdges, renderUtils } = graphState;

  if (!layoutEdges) {
    return null;
  }

  return (
    <SvgLayer {...props} classNamePart="SvgEdgesLayer" extraWrapper={DEFAULT_STROKE_STYLE}>
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
