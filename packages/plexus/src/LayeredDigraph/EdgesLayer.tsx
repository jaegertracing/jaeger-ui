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

import SvgDefEntry from './SvgDefEntry';
import SvgEdge from './SvgEdge';
import { TExposedGraphState, ELayerType, TStandaloneEdgesLayer, TDefEntry } from './types';
import { assignMergeCss, getProps } from './utils';
import ZoomManager from '../ZoomManager';

type TProps<T = {}, U = {}> = Omit<TStandaloneEdgesLayer<T, U>, 'edges' | 'key'> & {
  classNamePrefix?: string;
  defs?: TDefEntry<T, U>[];
  graphState: TExposedGraphState<T, U>;
  markerEndId?: string;
  markerMidId?: string;
  markerStartId?: string;
  standalone?: boolean;
};

export default class EdgesLayer<T = {}, U = {}> extends React.PureComponent<TProps<T, U>> {
  renderSvg(standalone: boolean, elems: React.ReactElement[]) {
    const { classNamePrefix, defs, graphState, setOnContainer } = this.props;
    const { zoomTransform } = graphState;
    const containerProps = assignMergeCss(
      getProps(setOnContainer, graphState),
      {
        className: `${classNamePrefix} ${classNamePrefix}-LayeredDigraph--EdgesLayer`,
      },
      { transform: ZoomManager.getZoomAttr(zoomTransform) }
    );
    const g = <g {...containerProps}>{elems}</g>;
    if (!standalone) {
      return g;
    }

    // TODO(joe): Create a wrapper component for the defs so it can be shared
    // between the group, edges layers and various svg node layers
    const defEntries =
      defs == null ? null : (
        <defs>
          {defs.map(defEntry => (
            <SvgDefEntry<T, U> key={defEntry.localId} {...defEntry} graphState={graphState} />
          ))}
        </defs>
      );

    return (
      <svg style={{ minHeight: '100%', minWidth: '100%' }}>
        {defEntries}
        {g}
      </svg>
    );
  }

  render() {
    const {
      classNamePrefix,
      graphState,
      layerType,
      markerEndId,
      markerMidId,
      markerStartId,
      setOnEdge,
      standalone,
    } = this.props;

    const { layoutEdges, renderUtils } = graphState;
    if (!layoutEdges) {
      throw new Error('Edges are not available.');
    }
    const EdgeComponent: typeof SvgEdge | null = layerType === ELayerType.Svg ? SvgEdge : null;
    // TODO(joe): only support html edges
    if (!EdgeComponent) {
      throw new Error('Not implemented');
    }
    // TODO(joe): wrap the edges in a pure component so can render the <defs> without
    // rendering edges, i.e. avoid calling shouldComponentUpdate on each edge, call on
    // them as a group
    const elems: React.ReactElement[] = layoutEdges.map(edge => (
      <EdgeComponent<U>
        key={`${edge.edge.from}\v${edge.edge.to}`}
        classNamePrefix={classNamePrefix}
        layoutEdge={edge}
        markerEndId={markerEndId}
        markerMidId={markerMidId}
        markerStartId={markerStartId}
        renderUtils={renderUtils}
        setOnEdge={setOnEdge}
      />
    ));
    return this.renderSvg(Boolean(standalone), elems);
  }
}
