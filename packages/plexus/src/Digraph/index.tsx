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
  // sizeVertices: TSizeVertex<T>[] | null;
};

type TDigraphProps<T = unknown, U = unknown> = {
  className?: string;
  classNamePrefix?: string;
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

  private setSizeVertices = (senderKey: string, sizeVertices: TSizeVertex<T>[]) => {
    const { edges, layoutManager, measurableNodesKey: expectedKey } = this.props;
    if (senderKey !== expectedKey) {
      const values = `expected ${JSON.stringify(expectedKey)}, recieved ${JSON.stringify(senderKey)}`;
      throw new Error(`Key mismatch for measuring nodes; ${values}`);
    }
    const inVertices: (TSizeVertex<T> | TLayoutVertex<T>)[] = sizeVertices.map(v => this.state.layoutVertices && this.state.layoutVertices.get(v.vertex.key) || v);
    const inEdges: (TEdge<U> | TLayoutEdge<U>)[] = edges.map(edge => (this.state.layoutEdges && this.state.layoutEdges.get(edge)) || edge);
    const { positions, layout } = layoutManager.getLayout(inEdges, inVertices, this.state.layoutGraph);
    // TODO no timeout
    positions.then((...args) => setTimeout(() => this.onPositionsDone(...args), 350));
    // TODO  only timeout if edges take less than two seconds, else immediate
    layout.then((...args) => setTimeout(() => this.onLayoutDone(...args), this.state.layoutVertices ? 2350 : 350));
    this.setState({ layoutPhase: ELayoutPhase.CalcPositions });
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
        return layoutPhase === ELayoutPhase.Done ? (
          <SvgEdgesLayer
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
        ) : null;
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

  private onPositionsDone = (result: TCancelled | TPositionsDone<T>) => {
    if (result.isCancelled) {
      return;
    }
    const { graph: layoutGraph, vertices } = result;
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
    this.setState({ layoutGraph, layoutVertices });
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
    this.setState({ layoutEdges: edges, layoutGraph, layoutVertices, layoutPhase: ELayoutPhase.Done });
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
    const {
      className,
      classNamePrefix,
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
            {...this.zoomManager.getProps()}
          />
        )}
        {this.state.layoutPhase !== ELayoutPhase.Done && loadingIndicator}
      </div>
    );
  }
}
