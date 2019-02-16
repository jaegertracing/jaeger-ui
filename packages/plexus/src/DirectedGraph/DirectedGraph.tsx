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
import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity, zoomTransform as getTransform, ZoomTransform } from 'd3-zoom';

import EdgeArrowDef from './builtins/EdgeArrowDef';
import EdgesContainer from './builtins/EdgesContainer';
import PureEdges from './builtins/PureEdges';
import PureNodes from './builtins/PureNodes';
import MiniMap from './MiniMap';
import classNameIsSmall from './prop-factories/classNameIsSmall';
import mergePropSetters, { mergeClassNameAndStyle } from './prop-factories/mergePropSetters';
import scaledStrokeWidth from './prop-factories/scaledStrokeWidth';
import {
  constrainZoom,
  DEFAULT_SCALE_EXTENT,
  fitWithinContainer,
  getScaleExtent,
  getZoomAttr,
  getZoomStyle,
} from './transform-utils';

import { TDirectedGraphProps, TDirectedGraphState } from './types';
import { TCancelled, TLayoutDone, TPositionsDone, TVertex } from '../types/layout';

const PHASE_NO_DATA = 0;
const PHASE_CALC_SIZES = 1;
const PHASE_CALC_POSITIONS = 2;
const PHASE_CALC_EDGES = 3;
const PHASE_DONE = 4;

const WRAPPER_STYLE_ZOOM = {
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
};

const WRAPPER_STYLE = {
  position: 'relative',
};

let idCounter = 0;

// eslint-disable-next-line no-unused-vars
function defaultGetNodeLabel(TVertex: TVertex) {
  const { label } = TVertex;
  if (label != null) {
    if (typeof label === 'string' || React.isValidElement(label)) {
      return label;
    }
    return String(label);
  }
  return String(TVertex.key);
}

export default class DirectedGraph extends React.PureComponent<TDirectedGraphProps, TDirectedGraphState> {
  props: TDirectedGraphProps;
  arrowId: string;
  arrowIriRef: string;
  // ref API defs in flow seem to be a WIP
  // https://github.com/facebook/flow/issues/6103
  rootRef: { current: HTMLDivElement | null };
  rootSelection: any;
  vertexRefs: { current: HTMLElement | null }[];
  zoom: any;

  static propsFactories = {
    classNameIsSmall,
    mergePropSetters,
    scaledStrokeWidth,
  };

  static defaultProps = {
    arrowScaleDampener: undefined,
    className: '',
    classNamePrefix: 'plexus',
    // getEdgeLabel: defaultGetEdgeLabel,
    getNodeLabel: defaultGetNodeLabel,
    minimap: false,
    minimapClassName: '',
    zoom: false,
    zoomTransform: zoomIdentity,
  };

  state: TDirectedGraphState = {
    edges: [],
    layoutPhase: PHASE_NO_DATA,
    sizeVertices: null,
    layoutEdges: null,
    layoutGraph: null,
    layoutVertices: null,
    vertexRefs: [],
    vertices: [],
    zoomEnabled: false,
    zoomTransform: zoomIdentity,
  };

  static getDerivedStateFromProps(nextProps: TDirectedGraphProps, prevState: TDirectedGraphState) {
    const { edges, vertices, zoom: zoomEnabled } = nextProps;
    const { edges: stEdges, vertices: stVertices, zoomEnabled: stZoomEnabled } = prevState;
    if (zoomEnabled !== stZoomEnabled) {
      throw new Error('Zoom cannot be toggled');
    }
    if (edges === stEdges && vertices === stVertices) {
      return null;
    }
    return {
      edges,
      vertices,
      layoutPhase: PHASE_CALC_SIZES,
      vertexRefs: vertices.map(React.createRef),
      sizeVertices: null,
      layoutEdges: null,
      layoutGraph: null,
      layoutVertices: null,
    };
  }

  constructor(props: TDirectedGraphProps) {
    super(props);
    const { edges, vertices, zoom: zoomEnabled } = props;
    if (Array.isArray(edges) && edges.length && Array.isArray(vertices) && vertices.length) {
      this.state.layoutPhase = PHASE_CALC_SIZES;
      this.state.edges = edges;
      this.state.vertices = vertices;
      this.state.vertexRefs = vertices.map(() => React.createRef<HTMLElement>());
    }
    this.state.zoomEnabled = zoomEnabled;
    const idBase = `plexus--DirectedGraph--${idCounter}`;
    idCounter += 1;
    this.arrowId = EdgeArrowDef.getId(idBase);
    this.arrowIriRef = EdgeArrowDef.getIriRef(idBase);
    this.rootRef = React.createRef();
    if (zoomEnabled) {
      this.zoom = d3Zoom()
        .scaleExtent(DEFAULT_SCALE_EXTENT)
        .constrain(this._constrainZoom)
        .on('zoom', this._onZoomed);
    }
  }

  componentDidMount() {
    this._setSizeVertices();
    this.rootSelection = select(this.rootRef.current);
  }

  componentDidUpdate() {
    const { layoutPhase } = this.state;
    if (layoutPhase === PHASE_CALC_SIZES) {
      this._setSizeVertices();
    }
  }

  _onPositionsDone = (result: TCancelled | TPositionsDone) => {
    // typescript requires the `=== false` check for correct type inference
    if (result.isCancelled === false) {
      const { graph: layoutGraph, vertices: layoutVertices } = result;
      this.setState({ layoutGraph, layoutVertices, layoutPhase: PHASE_CALC_EDGES });
    }
  };

  _onLayoutDone = (result: TCancelled | TLayoutDone) => {
    const root = this.rootRef.current;
    // typescript requires the `=== true` check for correct type inference
    if (result.isCancelled === true || !root) {
      return;
    }
    const { zoomEnabled } = this.state;
    const { edges: layoutEdges, graph: layoutGraph, vertices: layoutVertices } = result;
    const { clientHeight: height, clientWidth: width } = root;
    let zoomTransform = zoomIdentity;
    if (zoomEnabled) {
      const scaleExtent = getScaleExtent(layoutGraph.width, layoutGraph.height, width, height);
      zoomTransform = fitWithinContainer(layoutGraph.width, layoutGraph.height, width, height);
      this.zoom.scaleExtent(scaleExtent);
      this.rootSelection.call(this.zoom);
      // set the initial transform
      this.zoom.transform(this.rootSelection, zoomTransform);
    }
    this.setState({ layoutEdges, layoutGraph, layoutVertices, zoomTransform, layoutPhase: PHASE_DONE });
  };

  _onZoomed = () => {
    const root = this.rootRef.current;
    if (!root) {
      return;
    }
    const zoomTransform = getTransform(root);
    this.setState({ zoomTransform });
  };

  _constrainZoom = (transform: ZoomTransform, extent: [[number, number], [number, number]]) => {
    const [, [vw, vh]] = extent;
    const { height: h = null, width: w = null } = this.state.layoutGraph || {};
    if (h == null || w == null) {
      // for flow
      return transform;
    }
    return constrainZoom(transform, w, h, vw, vh);
  };

  _resetZoom = () => {
    const root = this.rootRef.current;
    const layoutGraph = this.state.layoutGraph;
    if (!root || !layoutGraph) {
      return;
    }
    const { clientHeight: height, clientWidth: width } = root;
    const zoomTransform = fitWithinContainer(layoutGraph.width, layoutGraph.height, width, height);
    this.zoom.transform(this.rootSelection, zoomTransform);
    this.setState({ zoomTransform });
  };

  _setSizeVertices() {
    const { edges, layoutManager, vertices } = this.props;
    const sizeVertices = this.state.vertexRefs
      .map((ref, i) => {
        const { current } = ref;
        return !current
          ? null
          : {
              height: current.offsetHeight,
              vertex: vertices[i],
              width: current.offsetWidth,
            };
      })
      .filter(Boolean);
    const { positions, layout } = layoutManager.getLayout(edges, sizeVertices);
    positions.then(this._onPositionsDone);
    layout.then(this._onLayoutDone);
    this.setState({ sizeVertices, layoutPhase: PHASE_CALC_POSITIONS });
  }

  _renderVertices() {
    const { classNamePrefix, getNodeLabel, setOnNode, vertices } = this.props;
    const { layoutVertices, vertexRefs } = this.state;
    return (
      <PureNodes
        classNamePrefix={classNamePrefix}
        getNodeLabel={getNodeLabel || defaultGetNodeLabel}
        layoutVertices={layoutVertices}
        setOnNode={setOnNode}
        vertexRefs={vertexRefs}
        vertices={vertices}
      />
    );
  }

  _renderEdges() {
    const { setOnEdgePath } = this.props;
    const { layoutEdges } = this.state;
    return (
      layoutEdges && (
        <PureEdges setOnEdgePath={setOnEdgePath} layoutEdges={layoutEdges} arrowIriRef={this.arrowIriRef} />
      )
    );
  }

  render() {
    const {
      arrowScaleDampener,
      className,
      classNamePrefix,
      minimap: minimapEnabled,
      minimapClassName,
      setOnEdgesContainer,
      setOnNodesContainer,
      setOnRoot,
    } = this.props;
    const { layoutPhase: phase, layoutGraph, zoomEnabled, zoomTransform } = this.state;
    const { height = null, width = null } = layoutGraph || {};
    const { current: rootElm } = this.rootRef;
    const haveEdges = phase === PHASE_DONE;

    const nodesContainerProps = mergeClassNameAndStyle(
      (setOnNodesContainer && setOnNodesContainer(this.state)) || {},
      {
        style: {
          ...(zoomEnabled ? getZoomStyle(zoomTransform) : null),
          position: 'absolute',
          top: 0,
          left: 0,
        },
        className: `${classNamePrefix}-DirectedGraph--nodeContainer`,
      }
    );
    const edgesContainerProps = mergeClassNameAndStyle(
      (setOnEdgesContainer && setOnEdgesContainer(this.state)) || {},
      {
        style: { minHeight: '100%', minWidth: '100%' },
        className: `${classNamePrefix}-DirectedGraph--nodeContainer`,
      }
    );
    const rootProps = mergeClassNameAndStyle((setOnRoot && setOnRoot(this.state)) || {}, {
      style: zoomEnabled ? WRAPPER_STYLE_ZOOM : WRAPPER_STYLE,
      className: `${classNamePrefix}-DirectedGraph ${className}`,
    });

    return (
      <div {...rootProps} ref={this.rootRef}>
        {layoutGraph &&
          haveEdges && (
            <EdgesContainer {...edgesContainerProps} height={height} width={width}>
              <EdgeArrowDef
                id={this.arrowId}
                scaleDampener={arrowScaleDampener}
                zoomScale={zoomEnabled ? zoomTransform.k : null}
              />
              <g transform={zoomEnabled ? getZoomAttr(zoomTransform) : null}>{this._renderEdges()}</g>
            </EdgesContainer>
          )}
        <div {...nodesContainerProps}>{this._renderVertices()}</div>
        {zoomEnabled &&
          minimapEnabled &&
          layoutGraph &&
          rootElm && (
            <MiniMap
              className={minimapClassName}
              classNamePrefix={classNamePrefix}
              contentHeight={height}
              contentWidth={width}
              viewAll={this._resetZoom}
              viewportHeight={rootElm.clientHeight}
              viewportWidth={rootElm.clientWidth}
              {...zoomTransform}
            />
          )}
      </div>
    );
  }
}
