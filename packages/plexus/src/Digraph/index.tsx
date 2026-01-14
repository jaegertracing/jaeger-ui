// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

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
import LayoutManager from '../LayoutManager';
import { TCancelled, TEdge, TLayoutDone, TSizeVertex, TVertex } from '../types';
import TNonEmptyArray from '../types/TNonEmptyArray';
import MiniMap from '../zoom/MiniMap';
import ZoomManager, { zoomIdentity, ZoomTransform } from '../zoom/ZoomManager';

type TDigraphState<T = {}, U = {}> = Omit<TExposedGraphState<T, U>, 'renderUtils'> & {
  sizeVertices: TSizeVertex<T>[] | null;
};

type TDigraphProps<T = unknown, U = unknown> = {
  className?: string;
  classNamePrefix?: string;
  edges: TEdge<U>[];
  layers: TNonEmptyArray<TLayer<T, U>>;
  layoutManager: LayoutManager;
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

function getInitialState<T, U>(edges: TEdge<U>[], vertices: TVertex<T>[]): TDigraphState<T, U> {
  const hasData = Array.isArray(edges) && edges.length && Array.isArray(vertices) && vertices.length;
  return {
    edges: hasData ? edges : [],
    layoutEdges: null,
    layoutGraph: null,
    layoutPhase: hasData ? ELayoutPhase.CalcSizes : ELayoutPhase.NoData,
    layoutVertices: null,
    sizeVertices: null,
    vertices: hasData ? vertices : [],
    zoomTransform: zoomIdentity,
  };
}

const Digraph = <T = unknown, U = unknown>(props: TDigraphProps<T, U>) => {
  const {
    className = '',
    classNamePrefix = 'plexus',
    edges,
    layers: topLayers,
    layoutManager,
    measurableNodesKey,
    minimap: minimapEnabled = false,
    minimapClassName = '',
    setOnGraph,
    style,
    vertices,
    zoom: zoomEnabled = false,
  } = props;

  // Generate unique base ID once per component instance
  const baseIdRef = React.useRef(`plexus--Digraph--${idCounter++}`);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Create ZoomManager once if zoom is enabled
  const zoomManagerRef = React.useRef<ZoomManager | null>(null);

  // State management
  const [state, setState] = React.useState<TDigraphState<T, U>>(() => getInitialState(edges, vertices));

  // Initialize ZoomManager on first render if zoom is enabled
  if (zoomEnabled && !zoomManagerRef.current) {
    zoomManagerRef.current = new ZoomManager((zoomTransform: ZoomTransform) => {
      setState(prev => ({ ...prev, zoomTransform }));
    });
  }

  const zoomManager = zoomManagerRef.current;

  // Utility functions
  const getGlobalId = React.useCallback((name: string) => `${baseIdRef.current}--${name}`, []);

  const getZoomTransform = React.useCallback(() => state.zoomTransform, [state.zoomTransform]);

  // Memoize renderUtils
  const renderUtils: TRendererUtils = React.useMemo(
    () => ({
      getGlobalId,
      getZoomTransform,
    }),
    [getGlobalId, getZoomTransform]
  );

  // Memoize class name factory
  const getClassName = React.useMemo(
    () => (name: string) => `${classNamePrefix} ${classNamePrefix}-Digraph--${name}`,
    [classNamePrefix]
  );

  // Handle layout completion
  const onLayoutDone = React.useCallback(
    (result: TCancelled | TLayoutDone<T, U>) => {
      if (result.isCancelled) {
        return;
      }
      const { edges: layoutEdges, graph: layoutGraph, vertices: layoutVertices } = result;
      setState(prev => ({
        ...prev,
        layoutEdges,
        layoutGraph,
        layoutVertices,
        layoutPhase: ELayoutPhase.Done,
      }));
      if (zoomManager) {
        zoomManager.setContentSize(layoutGraph);
      }
    },
    [zoomManager]
  );

  // Handle size vertices from measurable layer
  const setSizeVertices = React.useCallback(
    (senderKey: string, sizeVertices: TSizeVertex<T>[]) => {
      if (senderKey !== measurableNodesKey) {
        const values = `expected ${JSON.stringify(measurableNodesKey)}, received ${JSON.stringify(senderKey)}`;
        throw new Error(`Key mismatch for measuring nodes; ${values}`);
      }
      setState(prev => ({ ...prev, sizeVertices, layoutPhase: ELayoutPhase.CalcPositions }));
      const { layout } = layoutManager.getLayout(edges, sizeVertices);
      layout.then(onLayoutDone);
    },
    [edges, layoutManager, measurableNodesKey, onLayoutDone]
  );

  // Set element on ZoomManager after mount
  React.useEffect(() => {
    const { current } = rootRef;
    if (current && zoomManager) {
      zoomManager.setElement(current);
    }
  }, [zoomManager]);

  // Build graph state for layers
  const { sizeVertices: _, ...partialGraphState } = state;
  const graphState = {
    ...partialGraphState,
    renderUtils,
  };
  const { layoutPhase } = graphState;

  // Render layers
  const renderedLayers = topLayers.map(layer => {
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
            setSizeVertices={setSizeVertices}
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
          setSizeVertices={setSizeVertices}
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

  const builtinStyle = zoomManager ? WRAPPER_STYLE_ZOOM : WRAPPER_STYLE;
  const rootProps = assignMergeCss(
    {
      style: builtinStyle,
      className: `${classNamePrefix} ${classNamePrefix}-Digraph`,
    },
    { className, style },
    getProps(setOnGraph, { ...state, renderUtils })
  );

  return (
    <div {...rootProps}>
      <div style={builtinStyle} ref={rootRef}>
        {renderedLayers}
      </div>
      {minimapEnabled && zoomManager && (
        <MiniMap className={minimapClassName} classNamePrefix={classNamePrefix} {...zoomManager.getProps()} />
      )}
    </div>
  );
};

// React.memo provides shallow comparison equivalent to PureComponent
type TDigraphWithStatics = typeof Digraph & {
  propsFactories: Record<string, TFromGraphStateFn<any, any>>;
  scaleProperty: typeof scaleProperty;
  defaultProps: {
    className: string;
    classNamePrefix: string;
    minimap: boolean;
    minimapClassName: string;
    zoom: boolean;
  };
};

const MemoizedDigraph = React.memo(Digraph) as unknown as TDigraphWithStatics;

// Static properties - assigned to memoized component for external access
MemoizedDigraph.propsFactories = {
  classNameIsSmall,
  scaleOpacity: scaleProperty.opacity,
  scaleStrokeOpacity: scaleProperty.strokeOpacity,
  scaleStrokeOpacityStrong: scaleProperty.strokeOpacityStrong,
  scaleStrokeOpacityStrongest: scaleProperty.strokeOpacityStrongest,
};

MemoizedDigraph.scaleProperty = scaleProperty;

MemoizedDigraph.defaultProps = {
  className: '',
  classNamePrefix: 'plexus',
  minimap: false,
  minimapClassName: '',
  zoom: false,
};

export default MemoizedDigraph;
