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
import { TSetProps, TFromGraphStateFn, TDefEntry } from '@jaegertracing/plexus/lib/Digraph/types';
import { TEdge } from '@jaegertracing/plexus/lib/types';
import TNonEmptyArray from '@jaegertracing/plexus/lib/types/TNonEmptyArray';

import DdgNodeContent from './DdgNodeContent';
import getNodeRenderers from './getNodeRenderers';
import getSetOnEdge from './getSetOnEdge';
import { PathElem, TDdgVertex, EViewModifier } from '../../../model/ddg/types';

import './index.css';

type TProps = {
  edges: TEdge[];
  edgesViewModifiers: Map<string, number>;
  getVisiblePathElems: (vertexKey: string) => PathElem[] | undefined;
  setViewModifier: (vertexKey: string, viewModifier: EViewModifier, enable: boolean) => void;
  uiFindMatches: Set<TDdgVertex> | undefined;
  vertices: TDdgVertex[];
  verticesViewModifiers: Map<string, number>;
};

const { scaleStrokeOpacityStrongest } = Digraph.propsFactories;

const setOnEdgesContainer: TSetProps<TFromGraphStateFn<TDdgVertex, any>> = [
  scaleStrokeOpacityStrongest,
  { stroke: '#444', strokeWidth: 0.7 },
];

const edgesDefs: TNonEmptyArray<TDefEntry<TDdgVertex, unknown>> = [
  { localId: 'arrow' },
  { localId: 'arrow-hovered', setOnEntry: { className: 'DdgArrow is-pathHovered' } },
];

export default class Graph extends PureComponent<TProps> {
  private getNodeRenderers = memoize(getNodeRenderers);
  private getNodeContentRenderer = memoize(DdgNodeContent.getNodeRenderer);
  private getSetOnEdge = memoize(getSetOnEdge);

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
    const {
      edges,
      edgesViewModifiers,
      getVisiblePathElems,
      setViewModifier,
      uiFindMatches,
      vertices,
      verticesViewModifiers,
    } = this.props;
    const findRenderers = this.getNodeRenderers(uiFindMatches || this.emptyFindSet, verticesViewModifiers);

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
            defs: edgesDefs,
            markerEndId: 'arrow',
            setOnContainer: setOnEdgesContainer,
            setOnEdge: this.getSetOnEdge(edgesViewModifiers),
          },
          {
            key: 'nodes/content',
            layerType: 'html',
            measurable: true,
            measureNode: DdgNodeContent.measureNode,
            renderNode: this.getNodeContentRenderer(getVisiblePathElems, setViewModifier),
          },
        ]}
      />
    );
  }
}
