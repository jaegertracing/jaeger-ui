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

import SvgDoc from './SvgDoc';
import SvgEdge from './SvgEdge';
import { TExposedGraphState, TStandaloneEdgesLayer } from './types';
import { assignMergeCss, getProps } from './utils';

type TProps<T = {}, U = {}> = Omit<TStandaloneEdgesLayer<T, U>, 'edges' | 'layerType' | 'key'> & {
  classNamePrefix?: string;
  graphState: TExposedGraphState<T, U>;
  standalone?: boolean;
};

export default class SvgEdgesLayer<T = {}, U = {}> extends React.PureComponent<TProps<T, U>> {
  render() {
    const {
      classNamePrefix,
      defs,
      graphState,
      markerEndId,
      markerStartId,
      setOnContainer,
      setOnEdge,
      standalone,
    } = this.props;

    const { layoutEdges, renderUtils } = graphState;
    if (!layoutEdges) {
      return null;
    }
    const gProps = assignMergeCss(getProps(setOnContainer, graphState), {
      className: `${classNamePrefix} ${classNamePrefix}-LayeredDigraph--SvgEdgesLayer`,
    });
    const g = (
      // Add the default black stroke on an outter <g> so CSS classes or styles
      // on the inner <g> can override it
      // TODO: A more configurable appraoch to setting a default stroke color
      <g style={{ stroke: '#000' }}>
        <g {...gProps}>
          {layoutEdges.map(edge => (
            // TODO(joe): wrap the edges in a pure component so can render the <defs> without
            // rendering edges, i.e. avoid calling shouldComponentUpdate on each edge, call on
            // them as a group
            <SvgEdge<U>
              key={`${edge.edge.from}\v${edge.edge.to}`}
              classNamePrefix={classNamePrefix}
              layoutEdge={edge}
              markerEndId={markerEndId}
              markerStartId={markerStartId}
              renderUtils={renderUtils}
              setOnEdge={setOnEdge}
            />
          ))}
        </g>
      </g>
    );
    return standalone ? <SvgDoc {...{ classNamePrefix, graphState, defs }}>{g}</SvgDoc> : g;
  }
}
