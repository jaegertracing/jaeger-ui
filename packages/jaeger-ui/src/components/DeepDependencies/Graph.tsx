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
import { DirectedGraph, LayoutManager } from '@jaegertracing/plexus';
import { TEdge } from '@jaegertracing/plexus/lib/types';

import getNodeLabel from './getNodeLabel';

import { TDdgVertex } from '../../model/ddg/types';

type TProps = {
  edges: TEdge[];
  uiFindMatches: Set<TDdgVertex> | undefined;
  vertices: TDdgVertex[];
};

export default class Graph extends PureComponent<TProps> {
  private layoutManager: LayoutManager;

  constructor(props: TProps) {
    super(props);
    this.layoutManager = new LayoutManager({ useDotEdges: true, splines: 'polyline' });
  }

  render() {
    const { edges, uiFindMatches, vertices } = this.props;

    return (
      <DirectedGraph
        minimap
        zoom
        arrowScaleDampener={0}
        minimapClassName="u-miniMap"
        layoutManager={this.layoutManager}
        edges={edges}
        vertices={vertices}
        getNodeLabel={getNodeLabel(uiFindMatches)}
      />
    );
  }
}
