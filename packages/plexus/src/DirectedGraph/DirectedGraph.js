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

import * as arrow from './builtins/EdgeArrow';
import EdgePath from './builtins/EdgePath';
import EdgesContainer from './builtins/EdgesContainer';
import Node from './builtins/Node';
import type { DirectedGraphProps, DirectedGraphState } from './types';
import type { Edge, Vertex } from '../types/layout';

import './DirectedGraph.css';

const PHASE_NO_DATA = 0;
const PHASE_CALC_SIZES = 1;
const PHASE_CALC_POSITIONS = 2;
const PHASE_CALC_EDGES = 3;
const PHASE_DONE = 4;

function defaultGetEdgeLabel(
  edge: Edge,
  from: Vertex,
  to: Vertex,
  getNodeLabel: Vertex => string | React.Node
) {
  const { label } = edge;
  if (label != null) {
    if (typeof label === 'string' || React.isValidElement(label)) {
      return label;
    }
    return String(label);
  }
  return (
    <React.Fragment>
      {getNodeLabel(from)} → {getNodeLabel(to)}
    </React.Fragment>
  );
}

function defaultGetNodeLabel(vertex: Vertex) {
  const { label } = vertex;
  if (label != null) {
    if (typeof label === 'string' || React.isValidElement(label)) {
      return label;
    }
    return String(label);
  }
  return String(vertex.key);
}

export default class DirectedGraph extends React.PureComponent<DirectedGraphProps, DirectedGraphState> {
  // ref API defs in flow seem to be a WIP
  // https://github.com/facebook/flow/issues/6103
  vertexRefs: { current: ?HTMLElement }[];

  static defaultProps = {
    classNamePrefix: 'plexus',
    getEdgeLabel: defaultGetEdgeLabel,
    getNodeLabel: defaultGetNodeLabel,
  };

  state = {
    edges: [],
    layoutPhase: PHASE_NO_DATA,
    sizeVertices: null,
    layoutEdges: null,
    layoutGraph: null,
    layoutVertices: null,
    vertexRefs: [],
    vertices: [],
  };

  static getDerivedStateFromProps(nextProps: DirectedGraphProps, prevState: DirectedGraphState) {
    const { edges: nxEdges, vertices: nxVertices } = nextProps;
    const { edges: stEdges, vertices: stVertices } = prevState;
    if (nxEdges === stEdges && nxVertices === stVertices) {
      return null;
    }
    return {
      layoutPhase: PHASE_CALC_SIZES,
      edges: nxEdges,
      vertices: nxVertices,
      vertexRefs: nxVertices.map(React.createRef),
      sizeVertices: null,
      layoutEdges: null,
      layoutGraph: null,
      layoutVertices: null,
    };
  }

  constructor(props: DirectedGraphProps) {
    super(props);
    const { edges, vertices } = props;
    if (Array.isArray(edges) && edges.length && Array.isArray(vertices) && vertices.length) {
      this.state.layoutPhase = PHASE_CALC_SIZES;
      this.state.edges = edges;
      this.state.vertices = vertices;
      this.state.vertexRefs = vertices.map(React.createRef);
    }
  }

  componentDidMount() {
    this._setSizeVertices();
  }

  componentDidUpdate() {
    const { layoutPhase } = this.state;
    if (layoutPhase === PHASE_CALC_SIZES) {
      this._setSizeVertices();
    }
  }

  _setSizeVertices() {
    const { edges, layoutManager, vertices } = this.props;
    const sizeVertices = this.state.vertexRefs
      .map((ref, i) => {
        const { current } = ref;
        if (!current) {
          return null;
        }
        return {
          height: current.offsetHeight,
          vertex: vertices[i],
          width: current.offsetWidth,
        };
      })
      .filter(Boolean);
    const { positions, layout } = layoutManager.getLayout(edges, sizeVertices);
    positions.then(({ isCancelled, graph: layoutGraph, vertices: layoutVertices }) => {
      if (isCancelled) {
        return;
      }
      this.setState({ layoutGraph, layoutVertices, layoutPhase: PHASE_CALC_EDGES });
    });
    layout.then(({ isCancelled, edges: layoutEdges, graph: layoutGraph, vertices: layoutVertices }) => {
      if (isCancelled) {
        return;
      }
      this.setState({ layoutEdges, layoutGraph, layoutVertices, layoutPhase: PHASE_DONE });
    });
    this.setState({ sizeVertices, layoutPhase: PHASE_CALC_POSITIONS });
  }

  _renderVertices() {
    const { classNamePrefix, getNodeLabel, setOnNode, vertices } = this.props;
    const { vertexRefs } = this.state;
    const _getLabel = getNodeLabel != null ? getNodeLabel : defaultGetNodeLabel;
    return vertices.map((v, i) => (
      <Node
        key={v.key}
        ref={vertexRefs[i]}
        hidden
        classNamePrefix={classNamePrefix}
        label={_getLabel(v)}
        {...setOnNode && setOnNode(v)}
      />
    ));
  }

  _renderLayoutVertices() {
    const { layoutVertices, vertexRefs } = this.state;
    if (!layoutVertices) {
      return null;
    }
    const { classNamePrefix, getNodeLabel, setOnNode } = this.props;
    const _getLabel = getNodeLabel != null ? getNodeLabel : defaultGetNodeLabel;
    return layoutVertices.map((lv, i) => (
      <Node
        key={lv.vertex.key}
        ref={vertexRefs[i]}
        classNamePrefix={classNamePrefix}
        label={_getLabel(lv.vertex)}
        left={lv.left}
        top={lv.top}
        {...setOnNode && setOnNode(lv.vertex)}
      />
    ));
  }

  _renderLayoutEdges() {
    const { setOnEdgePath } = this.props;
    const { layoutEdges } = this.state;
    if (!layoutEdges) {
      return null;
    }
    return layoutEdges.map(edge => (
      <EdgePath
        key={`${edge.edge.from}\v${edge.edge.to}`}
        pathPoints={edge.pathPoints}
        markerEnd={arrow.iriRef}
        {...setOnEdgePath && setOnEdgePath(edge.edge)}
      />
    ));
  }

  render() {
    const { classNamePrefix, setOnEdgesContainer, setOnNodesContainer, setOnRoot } = this.props;
    const { layoutPhase: phase, layoutGraph } = this.state;
    const havePosition = phase >= PHASE_CALC_EDGES;
    const haveEdges = phase === PHASE_DONE;
    const nodesContainerCls = `${classNamePrefix}-DirectedGraph--nodeContainer`;
    const nodesContainerProps: Object = (setOnNodesContainer && setOnNodesContainer(layoutGraph)) || {};
    if (nodesContainerProps.className) {
      nodesContainerProps.className = `${nodesContainerCls} ${nodesContainerProps.className}`;
    } else {
      nodesContainerProps.className = nodesContainerCls;
    }
    return (
      <div {...setOnRoot && setOnRoot(layoutGraph)}>
        <div {...nodesContainerProps}>
          {havePosition ? this._renderLayoutVertices() : this._renderVertices()}
        </div>
        {layoutGraph &&
          haveEdges && (
            <EdgesContainer
              {...setOnEdgesContainer && setOnEdgesContainer(layoutGraph)}
              height={layoutGraph.height}
              width={layoutGraph.width}
            >
              {arrow.defs}
              {this._renderLayoutEdges()}
            </EdgesContainer>
          )}
      </div>
    );
  }
}
