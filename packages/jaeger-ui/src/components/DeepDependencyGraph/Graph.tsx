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

import React, { Component } from 'react';
import { DirectedGraph, LayoutManager } from '@jaegertracing/plexus';

import GraphModel from '../../model/ddg/Graph';

import { TDdgModel } from '../../model/ddg/types';

type TProps = {
  ddgModel: TDdgModel;
  visEncoding?: string;
};

export default class Graph extends Component<TProps> {
  private graphModel: GraphModel;
  private layoutManager: LayoutManager;

  constructor(props: TProps) {
    super(props);
    const { ddgModel } = props;
    this.graphModel = new GraphModel({ ddgModel });
    this.layoutManager = new LayoutManager({ useDotEdges: true, splines: 'polyline' });
  }

  render() {
    const { edges, vertices } = this.graphModel.getVisible(this.props.visEncoding || '');

    return (
      <DirectedGraph
        minimap
        zoom
        arrowScaleDampener={0}
        minimapClassName="DeepDependencyGraph--miniMap"
        layoutManager={this.layoutManager}
        edges={edges}
        vertices={vertices}
      />
    );
  }
}
