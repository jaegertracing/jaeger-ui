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

import HtmlLayersGroup from './HtmlLayersGroup';
import MeasurableNodesLayer from './MeasurableNodesLayer';
import { classNameIsSmall, scaledStrokeWidth } from './props-factories';
import {
  ELayoutPhase,
  TExposedGraphState,
  TFromGraphStateFn,
  TLayer,
  TPropsFactory,
  TRendererUtils,
  ELayerType,
} from './types';
import { assignMergeCss, getProps } from './utils';
// TODO(joe): don't use stuff in ../DirectedGraph
import MiniMap from '../DirectedGraph/MiniMap';
import LayoutManager from '../LayoutManager';
import ZoomManager, { zoomIdentity, ZoomTransform } from '../ZoomManager';
import { TCancelled, TEdge, TLayoutDone, TSizeVertex, TVertex } from '../types';

type TLayeredDigraphState<T = {}, U = {}> = Omit<TExposedGraphState<T, U>, 'renderUtils'> & {
  sizeVertices: TSizeVertex<T>[] | null;
};

type TLayeredDigraphProps<T = {}, U = {}> = TPropsFactory<'setOnGraph', TFromGraphStateFn<T, U>> & {
  className?: string;
  classNamePrefix?: string;
  edges: TEdge<U>[];
  // require atleast one layer
  layers: [TLayer, ...TLayer[]];
  layoutManager: LayoutManager;
  measurableNodesKey: string;
  minimap?: boolean;
  minimapClassName?: string;
  style?: React.CSSProperties;
  vertices: TVertex<T>[];
  zoom?: boolean;
};

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

export default class LayeredDigraph<T = {}, U = {}> extends React.PureComponent<
  TLayeredDigraphProps<T, U>,
  TLayeredDigraphState<T, U>
> {
  renderUtils: TRendererUtils;

  static propsFactories = {
    classNameIsSmall,
    scaledStrokeWidth,
  };

  static defaultProps = {
    className: '',
    classNamePrefix: 'plexus',
    minimap: false,
    minimapClassName: '',
    zoom: false,
  };

  state: TLayeredDigraphState<T, U> = {
    edges: [],
    layoutEdges: null,
    layoutGraph: null,
    layoutPhase: ELayoutPhase.NoData,
    layoutVertices: null,
    sizeVertices: null,
    vertices: [],
    zoomTransform: zoomIdentity,
  };

  baseId = `plexus--LayeredDigraph--${idCounter++}`;

  rootRef: React.RefObject<HTMLDivElement> = React.createRef();

  zoomManager: ZoomManager | null = null;

  constructor(props: TLayeredDigraphProps<T, U>) {
    super(props);
    const { edges, vertices, zoom: zoomEnabled } = props;
    if (Array.isArray(edges) && edges.length && Array.isArray(vertices) && vertices.length) {
      this.state.layoutPhase = ELayoutPhase.CalcSizes;
      this.state.edges = edges;
      this.state.vertices = vertices;
    }
    if (zoomEnabled) {
      this.zoomManager = new ZoomManager(this.onZoomUpdated);
    } else {
      this.zoomManager = null;
    }
    this.renderUtils = {
      getLocalId: this.getLocalId,
      getZoomTransform: this.getZoomTransform,
    };
  }

  componentDidMount() {
    const { current } = this.rootRef;
    if (current && this.zoomManager) {
      this.zoomManager.setElement(current);
    }
  }

  getLocalId = (name: string) => `${this.baseId}--${name}`;

  getZoomTransform = () => this.state.zoomTransform;

  private setSizeVertices = (senderKey: string, sizeVertices: TSizeVertex<T>[]) => {
    const { edges, layoutManager, measurableNodesKey: expectedKey } = this.props;
    if (senderKey !== expectedKey) {
      const values = `expected ${JSON.stringify(expectedKey)}, recieved ${JSON.stringify(senderKey)}`;
      throw new Error(`Key mismatch for measuring nodes; ${values}`);
    }
    this.setState({ sizeVertices });
    const { layout } = layoutManager.getLayout(edges, sizeVertices);
    // const { positions, layout } = layoutManager.getLayout(edges, sizeVertices);
    // positions.then(this._onPositionsDone);
    layout.then(this.onLayoutDone);
    this.setState({ sizeVertices, layoutPhase: ELayoutPhase.CalcPositions });
  };

  private renderLayers() {
    const { classNamePrefix, layers: topLayers } = this.props;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sizeVertices, ...partialGraphState } = this.state;
    const graphState = {
      ...partialGraphState,
      renderUtils: this.renderUtils,
    };
    return topLayers.map(layer => {
      const { layerType, key, layers, setOnContainer } = layer;
      if (layers) {
        if (layerType === ELayerType.Html) {
          return (
            <HtmlLayersGroup<T, U>
              key={key}
              graphState={graphState}
              layers={layers}
              classNamePrefix={classNamePrefix}
              setOnContainer={setOnContainer}
              setSizeVertices={this.setSizeVertices}
            />
          );
        }
        // svg group layer
        throw new Error('Not implemented');
      }
      const { edges } = layer;
      if (edges) {
        // edges standalone layer
        throw new Error('Not implemented');
      }
      if (layer.measurable) {
        // standalone measurable Nodes Layer
        const { nodeRender, setOnNode } = layer;
        return (
          <MeasurableNodesLayer<T, U>
            key={key}
            standalone
            classNamePrefix={classNamePrefix}
            graphState={graphState}
            layerType={layer.layerType}
            nodeRender={nodeRender}
            senderKey={key}
            setOnContainer={setOnContainer}
            setOnNode={setOnNode}
            setSizeVertices={this.setSizeVertices}
          />
        );
      }
      // regular nodes layer
      throw new Error('Not implemented');
    });
  }

  private onZoomUpdated = (zoomTransform: ZoomTransform) => {
    this.setState({ zoomTransform });
  };

  private onLayoutDone = (result: TCancelled | TLayoutDone) => {
    if (result.isCancelled) {
      return;
    }
    const { edges: layoutEdges, graph: layoutGraph, vertices: layoutVertices } = result;
    this.setState({ layoutEdges, layoutGraph, layoutVertices, layoutPhase: ELayoutPhase.Done });
    if (this.zoomManager) {
      this.zoomManager.setContentSize(layoutGraph);
    }
  };

  render() {
    const {
      className,
      classNamePrefix,
      minimap: minimapEnabled,
      minimapClassName,
      setOnGraph,
      style,
    } = this.props;
    const rootProps = assignMergeCss(
      { className, style },
      getProps(setOnGraph, { ...this.state, renderUtils: this.renderUtils }),
      {
        style: this.zoomManager ? WRAPPER_STYLE_ZOOM : WRAPPER_STYLE,
        className: `${classNamePrefix} ${classNamePrefix}-LayeredDigraph`,
      }
    );
    return (
      <div {...rootProps} ref={this.rootRef}>
        {this.renderLayers()}
        {minimapEnabled && this.zoomManager && (
          <MiniMap
            className={minimapClassName}
            classNamePrefix={classNamePrefix}
            {...this.zoomManager.getProps()}
          />
        )}
      </div>
    );
  }
}
