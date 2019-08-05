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

import React, { PureComponent } from 'react';
import memoize from 'memoize-one';
import { Digraph, LayoutManager } from '@jaegertracing/plexus';
import { TEdge } from '@jaegertracing/plexus/lib/types';
import { TSetProps, TFromGraphStateFn } from '@jaegertracing/plexus/lib/Digraph/types';

import DdgNodeContent from './DdgNodeContent';
import { getFindEmphasisRenderers } from './node-renderers';
import { TDdgVertex } from '../../../model/ddg/types';

type TProps = {
  edges: TEdge[];
  uiFindMatches: Set<TDdgVertex> | undefined;
  vertices: TDdgVertex[];
};

const { scaleOpacity, scaleStrokeOpacity } = Digraph.propsFactories;

const setOnEdgesContainer: TSetProps<TFromGraphStateFn<TDdgVertex, any>> = [
  scaleOpacity,
  scaleStrokeOpacity,
  { stroke: '#444', strokeWidth: 0.7 },
];

export default class Graph extends PureComponent<TProps> {
  private getFindEmphasisRenderers = memoize(getFindEmphasisRenderers);

  private layoutManager: LayoutManager = new LayoutManager({
    useDotEdges: true,
    splines: 'polyline',
    rankdir: 'TB',
  });

  private emptyFindSet: Set<TDdgVertex> = new Set();

  componentWillUnmount() {
    this.layoutManager.stopAndRelease();
  }

  render() {
    const { edges, uiFindMatches, vertices } = this.props;
    const findRenderers = this.getFindEmphasisRenderers(uiFindMatches || this.emptyFindSet);

    return (
      <Digraph<TDdgVertex>
        minimap
        zoom
        minimapClassName="u-miniMap"
        layoutManager={this.layoutManager}
        edges={edges}
        vertices={vertices}
        measurableNodesKey="nodes/content"
        layers={[
          {
            key: 'nodes/find-emphasis/vector-outline',
            layerType: 'svg',
            renderNode: findRenderers.vectorFindOutline,
          },
          {
            key: 'nodes/find-emphasis/html',
            layerType: 'html',
            renderNode: findRenderers.htmlFindEmphasis,
          },
          {
            key: 'nodes/find-emphasis/vector-color-band',
            layerType: 'svg',
            renderNode: findRenderers.vectorFindColorBand,
          },
          {
            key: 'nodes/vector-border',
            layerType: 'svg',
            renderNode: findRenderers.vectorBorder,
          },
          {
            key: 'edges',
            layerType: 'svg',
            edges: true,
            defs: [{ localId: 'arrow' }],
            markerEndId: 'arrow',
            setOnContainer: setOnEdgesContainer,
          },
          {
            key: 'nodes/content',
            layerType: 'html',
            measurable: true,
            measureNode: DdgNodeContent.measureNode,
            renderNode: DdgNodeContent.renderNode,
          },
        ]}
      />
    );
  }
}
