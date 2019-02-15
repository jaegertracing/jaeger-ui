// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
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

import Node from './Node';

import type { LayoutVertex, Vertex } from '../../types/layout';

type Props = {
  classNamePrefix: string,
  getNodeLabel: ?(Vertex) => string | React.Node,
  layoutVertices: ?(LayoutVertex[]),
  setOnNode: ?(Vertex) => ?Object,
  vertexRefs: { current: HTMLElement | null }[],
  vertices: Vertex[],
  nodeScale: number,
};

export default class PureEdges extends React.PureComponent<Props> {
  props: Props;

  _renderVertices() {
    const { classNamePrefix, getNodeLabel, setOnNode, vertices, vertexRefs, nodeScale } = this.props;
    return vertices.map((v, i) => (
      <Node
        key={v.key}
        ref={vertexRefs[i]}
        hidden
        classNamePrefix={classNamePrefix}
        labelFactory={getNodeLabel}
        vertex={v}
        nodeScale={nodeScale}
        {...setOnNode && setOnNode(v)}
      />
    ));
  }

  _renderLayoutVertices() {
    const { classNamePrefix, getNodeLabel, setOnNode, layoutVertices, vertexRefs, nodeScale } = this.props;
    if (!layoutVertices) {
      return null;
    }
    return layoutVertices.map((lv, i) => (
      <Node
        key={lv.vertex.key}
        ref={vertexRefs[i]}
        classNamePrefix={classNamePrefix}
        labelFactory={getNodeLabel}
        vertex={lv.vertex}
        left={lv.left}
        top={lv.top}
        nodeScale={nodeScale}
        {...setOnNode && setOnNode(lv.vertex)}
      />
    ));
  }

  render() {
    if (this.props.layoutVertices) {
      return this._renderLayoutVertices();
    }
    return this._renderVertices();
  }
}
