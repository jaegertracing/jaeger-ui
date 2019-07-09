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

import HtmlScope from './HtmlScope';
import HtmlScopeInternal from './HtmlScopeInternal';
import { ELayoutPhase, TContainerPropsFactoryFn, TRendererUtils } from './types';
import { isReactElement } from './utils';
// TODO(joe): don't use stuff in ../DirectedGraph
import classNameIsSmall from '../DirectedGraph/prop-factories/classNameIsSmall';
import mergePropSetters, { mergeClassNameAndStyle } from '../DirectedGraph/prop-factories/mergePropSetters';
import scaledStrokeWidth from '../DirectedGraph/prop-factories/scaledStrokeWidth';
import MiniMap from '../DirectedGraph/MiniMap';
import LayoutManager from '../LayoutManager';
import ZoomManager, { zoomIdentity, ZoomTransform } from '../ZoomManager';
import {
  TCancelled,
  TEdge,
  TLayoutDone,
  TLayoutEdge,
  TLayoutGraph,
  TLayoutVertex,
  TSizeVertex,
  TVertex,
} from '../types';

type TLayeredDirectedGraphState<T = {}, U = {}> = {
  edges: TEdge<U>[];
  layoutEdges: TLayoutEdge<U>[] | null;
  layoutGraph: TLayoutGraph | null;
  layoutPhase: ELayoutPhase;
  layoutVertices: TLayoutVertex<T>[] | null;
  sizeVertices: TSizeVertex<T>[] | null;
  vertices: TVertex<T>[];
  zoomTransform: ZoomTransform;
};

type TLayeredDirectedGraphProps<T = {}, U = {}> = {
  className?: string;
  classNamePrefix?: string;
  edges: TEdge<U>[];
  layoutManager: LayoutManager;
  minimap?: boolean;
  minimapClassName?: string;
  setOnContainer?: TContainerPropsFactoryFn;
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

export default class LayeredDirectedGraph<T = {}, U = {}> extends React.PureComponent<
  TLayeredDirectedGraphProps<T, U>,
  TLayeredDirectedGraphState<T, U>
> {
  static propsFactories = {
    classNameIsSmall,
    mergePropSetters,
    scaledStrokeWidth,
  };

  static defaultProps = {
    className: '',
    classNamePrefix: 'plexus',
    minimap: false,
    minimapClassName: '',
    zoom: false,
  };

  state: TLayeredDirectedGraphState<T, U> = {
    edges: [],
    layoutEdges: null,
    layoutGraph: null,
    layoutPhase: ELayoutPhase.NoData,
    layoutVertices: null,
    sizeVertices: null,
    vertices: [],
    zoomTransform: zoomIdentity,
  };

  constructor(props: TLayeredDirectedGraphProps<T, U>) {
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
  }

  componentDidMount() {
    const { current } = this.rootRef;
    if (current && this.zoomManager) {
      this.zoomManager.setElement(current);
    }
  }

  baseId = `plexus--LayeredDirectedGraph--${idCounter++}`;

  rootRef: React.RefObject<HTMLDivElement> = React.createRef();

  zoomManager: ZoomManager | null = null;

  getLocalId = (name: string) => `${this.baseId}--${name}`;

  getZoomTransform = () => this.state.zoomTransform;

  renderUtils: TRendererUtils = {
    getLocalId: this.getLocalId,
    getZoomTransform: this.getZoomTransform,
  };

  private setSizeVertices = (sizeVertices: TSizeVertex<T>[]) => {
    this.setState({ sizeVertices });
    const { edges, layoutManager } = this.props;
    const { layout } = layoutManager.getLayout(edges, sizeVertices);
    // const { positions, layout } = layoutManager.getLayout(edges, sizeVertices);
    // positions.then(this._onPositionsDone);
    layout.then(this.onLayoutDone);
    this.setState({ sizeVertices, layoutPhase: ELayoutPhase.CalcPositions });
  };

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
      edges,
      minimap: minimapEnabled,
      minimapClassName,
      vertices,
      setOnContainer,
    } = this.props;
    const { layoutEdges, layoutGraph, layoutVertices, zoomTransform } = this.state;
    const children = React.Children.map(this.props.children, child => {
      if (!isReactElement(child)) {
        return child;
      }
      if (child.type !== HtmlScope) {
        return child;
      }
      const props = {
        ...child.props,
        classNamePrefix,
        edges,
        layoutEdges,
        layoutGraph,
        layoutVertices,
        vertices,
        zoomTransform,
        renderUtils: this.renderUtils,
        setSizeVertices: this.setSizeVertices,
      };
      return <HtmlScopeInternal {...props} />;
    });
    const rootProps = mergeClassNameAndStyle(
      (setOnContainer && setOnContainer({ ...this.state, renderUtils: this.renderUtils })) || {},
      {
        style: this.zoomManager ? WRAPPER_STYLE_ZOOM : WRAPPER_STYLE,
        className: `${classNamePrefix}-DirectedGraph ${className}`,
      }
    );
    return (
      <div {...rootProps} ref={this.rootRef}>
        {children}
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
