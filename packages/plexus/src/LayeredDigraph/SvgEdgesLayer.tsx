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
import { TExposedGraphState, TStandaloneEdgesLayer, TDefEntry } from './types';
import { assignMergeCss, getProps } from './utils';
import TNonEmptyArray from '../types/TNonEmptyArray';
// import ZoomManager from '../ZoomManager';

type TProps<T = {}, U = {}> = Omit<TStandaloneEdgesLayer<T, U>, 'edges' | 'lsyerType' | 'key'> & {
  classNamePrefix?: string;
  defs?: TNonEmptyArray<TDefEntry<T, U>>;
  graphState: TExposedGraphState<T, U>;
  markerEndId?: string;
  markerMidId?: string;
  markerStartId?: string;
  standalone?: boolean;
};

export default class SvgEdgesLayer<T = {}, U = {}> extends React.PureComponent<TProps<T, U>> {
  render() {
    const {
      classNamePrefix,
      defs,
      graphState,
      markerEndId,
      markerMidId,
      markerStartId,
      setOnContainer,
      setOnEdge,
      standalone,
    } = this.props;

    const { layoutEdges, renderUtils } = graphState;
    if (!layoutEdges) {
      throw new Error('Edges are not available.');
    }
    const gProps = assignMergeCss(getProps(setOnContainer, graphState), {
      className: `${classNamePrefix} ${classNamePrefix}-LayeredDigraph--SvgEdgesLayer`,
    });
    const g = (
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
            markerMidId={markerMidId}
            markerStartId={markerStartId}
            renderUtils={renderUtils}
            setOnEdge={setOnEdge}
          />
        ))}
      </g>
    );
    return standalone ? <SvgDoc {...{ classNamePrefix, graphState, defs }}>{g}</SvgDoc> : g;
  }
}
