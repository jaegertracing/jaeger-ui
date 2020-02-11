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
import memoizeOne from 'memoize-one';

import HtmlLayersGroup from './HtmlLayersGroup';
import MeasurableNodesLayer from './MeasurableNodesLayer';
import NodesLayer from './NodesLayer';
import { classNameIsSmall, scaleProperty } from './props-factories';
import SvgEdgesLayer from './SvgEdgesLayer';
import SvgLayersGroup from './SvgLayersGroup';
import {
  ELayoutPhase,
  TExposedGraphState,
  TFromGraphStateFn,
  TLayer,
  TRendererUtils,
  ELayerType,
  TSetProps,
} from './types';
import { assignMergeCss, getProps } from './utils';
// TODO(joe): don't use stuff in ../DirectedGraph
import LayoutManager from '../LayoutManager';
import { TCancelled, TEdge, TLayoutDone, TLayoutEdge, TLayoutVertex, TPositionsDone, TSizeVertex, TVertex } from '../types';
import TNonEmptyArray from '../types/TNonEmptyArray';
import MiniMap from '../zoom/MiniMap';
import ZoomManager, { zoomIdentity, ZoomTransform } from '../zoom/ZoomManager';

type TDigraphState<T = {}, U = {}> = Omit<Omit<Omit<TExposedGraphState<T, U>, 'renderUtils'>, 'edges'>, 'vertices'> & {
  canCondense: boolean;
  hasIterated: boolean;
  // sizeVertices: TSizeVertex<T>[] | null;
};

type TDigraphProps<T = unknown, U = unknown> = {
  className?: string;
  classNamePrefix?: string;
  condenseBtnClassName?: string;
  edges: TEdge<U>[];
  layers: TNonEmptyArray<TLayer<T, U>>;
  layoutManager: LayoutManager;
  loadingIndicator?: React.ReactNode;
  measurableNodesKey: string;
  minimap?: boolean;
  minimapClassName?: string;
  setOnGraph?: TSetProps<TFromGraphStateFn<T, U>>;
  style?: React.CSSProperties;
  vertices: TVertex<T>[];
  zoom?: boolean;
};

const WRAPPER_STYLE_ZOOM: React.CSSProperties = {
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
};

const WRAPPER_STYLE: React.CSSProperties = {
  position: 'relative',
};

let idCounter = 0;

export default class Digraph<T = unknown, U = unknown> extends React.PureComponent<
  TDigraphProps<T, U>,
  TDigraphState<T, U>
> {
  renderUtils: TRendererUtils;

  static propsFactories: Record<string, TFromGraphStateFn<any, any>> = {
    classNameIsSmall,
    scaleOpacity: scaleProperty.opacity,
    scaleStrokeOpacity: scaleProperty.strokeOpacity,
    scaleStrokeOpacityStrong: scaleProperty.strokeOpacityStrong,
    scaleStrokeOpacityStrongest: scaleProperty.strokeOpacityStrongest,
  };

  static scaleProperty = scaleProperty;

  static defaultProps = {
    className: '',
    classNamePrefix: 'plexus',
    minimap: false,
    minimapClassName: '',
    zoom: false,
  };

  state: TDigraphState<T, U> = {
    canCondense: false,
    hasIterated: false,
    layoutEdges: null,
    layoutGraph: null,
    layoutPhase: ELayoutPhase.NoData,
    layoutVertices: null,
    // sizeVertices: null,
    zoomTransform: zoomIdentity,
  };

  baseId = `plexus--Digraph--${idCounter++}`;

  makeClassNameFactory = memoizeOne((classNamePrefix: string) => {
    return (name: string) => `${classNamePrefix} ${classNamePrefix}-Digraph--${name}`;
  });

  rootRef: React.RefObject<HTMLDivElement> = React.createRef();

  zoomManager: ZoomManager | null = null;

  constructor(props: TDigraphProps<T, U>) {
    super(props);
    const { edges, vertices, zoom: zoomEnabled } = props;
    if (Array.isArray(edges) && edges.length && Array.isArray(vertices) && vertices.length) {
      this.state.layoutPhase = ELayoutPhase.CalcSizes;
    }
    if (zoomEnabled) {
      this.zoomManager = new ZoomManager(this.onZoomUpdated);
    }
    this.renderUtils = {
      getGlobalId: this.getGlobalId,
      getZoomTransform: this.getZoomTransform,
    };
  }

  componentDidMount() {
    const { current } = this.rootRef;
    if (current && this.zoomManager) {
      this.zoomManager.setElement(current);
    }
  }

  getGlobalId = (name: string) => `${this.baseId}--${name}`;

  getZoomTransform = () => this.state.zoomTransform;

  private condense = () => {
    const { edges, vertices, layoutManager } = this.props;
    const newVertices = new Map<string, TSizeVertex<T>>();
    vertices.forEach(v => {
      const key = v.key;
      const lv = this.state.layoutVertices && this.state.layoutVertices.get(key);
      if (lv) {
        const { left, top, ...sv } = lv;
        newVertices.set(key, sv);
      }
    });

    if (newVertices.size !== vertices.length) {
      this.setState({
        layoutEdges: null,
        layoutVertices: null,
      });
      return;
    }

    const { positions, layout } = layoutManager.getLayout({
      newVertices,
      newEdges: edges,
      positionedEdges: new Map(),
      positionedVertices: new Map(),
      prevGraph: this.state.layoutGraph,
    });
    layout.then(res => {
      if (res.isCancelled) return;
      const { edges: _e, ...rest } = res;
      this.setState({ layoutEdges: null });
      this.onPositionsDone(rest as any);
      setTimeout(() => this.onLayoutDone(res as any), 2000);
    }); //, this.state.layoutVertices ? 2350 : 350)); // TODO no cast
    this.setState({ canCondense: false, layoutPhase: ELayoutPhase.CalcPositions });
  }

  private setSizeVertices = (senderKey: string, sizeVertices: TSizeVertex<T>[]) => {
    const { edges, layoutManager, measurableNodesKey: expectedKey } = this.props;
    if (senderKey !== expectedKey) {
      const values = `expected ${JSON.stringify(expectedKey)}, recieved ${JSON.stringify(senderKey)}`;
      throw new Error(`Key mismatch for measuring nodes; ${values}`);
    }
    const positionedVertices = new Map<string, TLayoutVertex<T>>();
    const newVertices = new Map<string, TSizeVertex<T>>();
    sizeVertices.forEach(v => {
      const key = v.vertex.key;
      const lv = this.state.layoutVertices && this.state.layoutVertices.get(key);
      if (lv) positionedVertices.set(key, lv);
      else newVertices.set(key, v);
    });
    const positionedEdges = new Map<TEdge<U>, TLayoutEdge<U>>();
    const newEdges: TEdge<U>[] = edges.filter(e => {
      const le = this.state.layoutEdges && this.state.layoutEdges.get(e);
      if (le) positionedEdges.set(e, le);
      return !le;
    });
    const { positions, layout } = layoutManager.getLayout({
      newVertices,
      newEdges,
      positionedEdges,
      positionedVertices,
      prevGraph: this.state.layoutGraph,
    });
    let positionTime: number | undefined;
    positions.then(res => {
      positionTime = Date.now();
      this.onPositionsDone(res as any);
    });
    layout.then(res => {
      const currentTime = Date.now();
      console.log(currentTime, positionTime);
      if (positionTime === undefined || currentTime - positionTime > 2000) this.onLayoutDone(res as any);
      else setTimeout(() => this.onLayoutDone(res as any), 2000 - (currentTime - positionTime));
    });
    // set canCondense in get derived state from props
    this.setState({ canCondense: Boolean(positionedVertices.size), hasIterated: this.state.hasIterated || Boolean(positionedVertices.size), layoutPhase: ELayoutPhase.CalcPositions });
  };

  private getGraphState = memoizeOne((state, edges: TEdge<U>[], vertices: TVertex<T>[]) => {
    const { layoutEdges: les, layoutVertices: lvs, ...partialGraphState } = this.state;
    const rv: TExposedGraphState<T, U> = {
      ...partialGraphState,
      edges,
      layoutEdges: null,
      layoutVertices: null,
      renderUtils: this.renderUtils,
      vertices,
    };

    if (lvs) {
      const layoutVertices = new Map();
      vertices.forEach(({ key }) => {
        const lv = lvs.get(key);
        if (lv) layoutVertices.set(key, lv);
      });

      rv.layoutVertices = layoutVertices;
    }

    if (les) {
      const layoutEdges = new Map();
      edges.forEach(edge => {
        const le = les.get(edge);
        if (le) layoutEdges.set(edge, le);
      });

      rv.layoutEdges = layoutEdges;
    }

    return rv;
  });

  private renderLayers() {
    const { edges, classNamePrefix, layers: topLayers, vertices } = this.props;
    const getClassName = this.makeClassNameFactory(classNamePrefix || '');
    const graphState = this.getGraphState(this.state, edges, vertices);
    const { layoutPhase } = graphState;
    return topLayers.map(layer => {
      const { layerType, key, setOnContainer } = layer;
      if (layer.layers) {
        if (layer.layerType === ELayerType.Html) {
          return (
            <HtmlLayersGroup<T, U>
              key={key}
              graphState={graphState}
              layers={layer.layers}
              getClassName={getClassName}
              setOnContainer={setOnContainer}
              setSizeVertices={this.setSizeVertices}
            />
          );
        }
        // svg group layer, the if is for TypeScript
        if (layer.layerType === ELayerType.Svg) {
          return (
            <SvgLayersGroup<T, U>
              key={key}
              getClassName={getClassName}
              defs={layer.defs}
              graphState={graphState}
              layers={layer.layers}
              setOnContainer={setOnContainer}
            />
          );
        }
      }
      if (layer.edges) {
        // edges standalone layer
        const { defs, markerEndId, markerStartId, setOnEdge } = layer;
        // return layoutPhase === ELayoutPhase.Done ? (
          return (<SvgEdgesLayer
            key={key}
            standalone
            getClassName={getClassName}
            defs={defs}
            graphState={graphState}
            markerEndId={markerEndId}
            markerStartId={markerStartId}
            setOnContainer={setOnContainer}
            setOnEdge={setOnEdge}
          />
          ); // : null;
      }
      if (layer.measurable) {
        // standalone measurable Nodes Layer
        const { measureNode, renderNode, setOnNode } = layer;
        return (
          <MeasurableNodesLayer<T, U>
            key={key}
            standalone
            getClassName={getClassName}
            graphState={graphState}
            layerType={layerType}
            measureNode={measureNode}
            renderNode={renderNode}
            senderKey={key}
            setOnContainer={setOnContainer}
            setOnNode={setOnNode}
            setSizeVertices={this.setSizeVertices}
          />
        );
      }
      const { renderNode } = layer;
      if (renderNode !== undefined) {
        return (
          <NodesLayer<T, U>
            key={key}
            standalone
            getClassName={getClassName}
            graphState={graphState}
            layerType={layer.layerType}
            renderNode={renderNode}
            setOnContainer={setOnContainer}
            setOnNode={layer.setOnNode}
          />
        );
      }
      throw new Error('Unrecognized layer');
    });
  }

  private onZoomUpdated = (zoomTransform: ZoomTransform) => {
    this.setState({ zoomTransform });
  };

  private onPositionsDone = (result: TCancelled | TPositionsDone<T, U>) => {
    if (result.isCancelled) {
      return;
    }
    const { graph: layoutGraph, edges, vertices } = result;
    if (this.zoomManager) {
      this.zoomManager.setContentSize(layoutGraph);
      if (!this.state.layoutEdges) this.zoomManager.resetZoom();
    }
    const layoutVertices = this.state.layoutVertices && vertices
    // TODO: no merge
      ? new Map([...this.state.layoutVertices.entries(), ...vertices.entries()])
      : vertices;

    if (this.zoomManager) {
      this.zoomManager.setContentSize(layoutGraph);
      if (!this.state.layoutVertices) this.zoomManager.resetZoom();
    }
    console.log(layoutGraph, layoutVertices);
    // this.setState({ layoutGraph, layoutVertices });
    const setStateArg: Partial<TDigraphState<T, U>> = { layoutGraph, layoutVertices };
    if (edges) {
      console.log('edges', edges);
      setStateArg.layoutEdges = edges;
    }
    this.setState(setStateArg as any); // TODO no cast
  };


  private onLayoutDone = (result: TCancelled | TLayoutDone<T, U>) => {
    if (result.isCancelled) {
      return;
    }
    // TODO: no vertices here?
    const { edges, graph: layoutGraph, vertices } = result;
    if (this.zoomManager) {
      this.zoomManager.setContentSize(layoutGraph);
      if (!this.state.layoutEdges) this.zoomManager.resetZoom();
    }
    const layoutVertices = this.state.layoutVertices && vertices
    // TODO: no merge
      ? new Map([...this.state.layoutVertices.entries(), ...vertices.entries()])
      : vertices;
    console.log('layout done edges');
    console.log(edges, edges && Array.from(edges.entries()).filter(([edge, le]) => le.translate));
    /*
    const layoutEdges = this.state.layoutEdges && edges
    // TODO: only merge when subset
      ? new Map([...this.state.layoutEdges.entries(), ...edges.entries()])
      : edges;
     */
    this.setState({ layoutEdges: new Map(edges ? [...edges.entries()] : []), layoutGraph, layoutVertices, layoutPhase: ELayoutPhase.Done });
  };

  /*
  shouldComponentUpdate(nextProps: TDigraphProps<T, U>, nextState: TDigraphState<T, U>) {
    let rv = false;
    Object.keys(nextProps).forEach((key) => {
      const k = key as keyof TDigraphProps<T, U>;
      if (nextProps[k] !== this.props[k]) {
        rv = true;
        console.log(`${k} changed in digraph props`);
      }
    });
    if (!rv) {
    Object.keys(nextState).forEach((key) => {
      const k = key as keyof TDigraphState<T, U>;
      if (nextState[k] !== this.state[k]) {
        rv = true;
        console.log(`${k} changed in digraph state`);
      }
    });
    }
    return rv;
  }
   */

  componentDidUpdate(_prevProps: TDigraphProps<T, U>, prevState: TDigraphState<T, U>) {
    if (prevState.layoutEdges !== this.state.layoutEdges) {
      console.log('layoutEdges changed from: ', prevState.layoutEdges, ' to: ', this.state.layoutEdges)
    }
  }

  render() {
    const { canCondense, hasIterated, layoutPhase } = this.state;
    const {
      className,
      classNamePrefix,
      condenseBtnClassName,
      edges,
      loadingIndicator,
      minimap: minimapEnabled,
      minimapClassName,
      setOnGraph,
      style,
      vertices,
    } = this.props;
    // console.log('digraph render');
    const builtinStyle = this.zoomManager ? WRAPPER_STYLE_ZOOM : WRAPPER_STYLE;
    // TODO: if not done, pointer events none?
    const rootProps = assignMergeCss(
      {
        style: builtinStyle,
        className: `${classNamePrefix} ${classNamePrefix}-Digraph`,
      },
      { className, style },
      getProps(setOnGraph, {
        ...this.state,
        edges,
        renderUtils: this.renderUtils,
        vertices,
      })
    );
    return (
      <div {...rootProps}>
        <div style={builtinStyle} ref={this.rootRef}>
          {this.renderLayers()}
        </div>
        {minimapEnabled && this.zoomManager && (
          <MiniMap
            className={minimapClassName}
            classNamePrefix={classNamePrefix}
            allowCondense={canCondense}
            condense={this.condense}
            showCondense={hasIterated}
            {...this.zoomManager.getProps()}
          />
        )}
        {this.state.layoutPhase !== ELayoutPhase.Done && loadingIndicator}
      </div>
    );
  }
}
