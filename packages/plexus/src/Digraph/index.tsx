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

const propsFactories: Record<string, TFromGraphStateFn<any, any>> = {
  classNameIsSmall,
  scaleOpacity: scaleProperty.opacity,
  scaleStrokeOpacity: scaleProperty.strokeOpacity,
  scaleStrokeOpacityStrong: scaleProperty.strokeOpacityStrong,
  scaleStrokeOpacityStrongest: scaleProperty.strokeOpacityStrongest,
};

function Digraph<T = unknown, U = unknown>(props: TDigraphProps<T, U>) {
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

  // State
  const [state, setState] = React.useState<TDigraphState<T, U>>(() => {
    const initialState: TDigraphState<T, U> = {
      edges: [],
      layoutEdges: null,
      layoutGraph: null,
      layoutPhase: ELayoutPhase.NoData,
      layoutVertices: null,
      sizeVertices: null,
      vertices: [],
      zoomTransform: zoomIdentity,
    };

    if (Array.isArray(edges) && edges.length && Array.isArray(vertices) && vertices.length) {
      initialState.layoutPhase = ELayoutPhase.CalcSizes;
      initialState.edges = edges;
      initialState.vertices = vertices;
    }

    return initialState;
  });

  // Refs
  const baseIdRef = React.useRef<string | null>(null);
  if (!baseIdRef.current) {
    baseIdRef.current = `plexus--Digraph--${idCounter++}`;
  }
  const baseId = baseIdRef.current as string;

  const rootRef = React.useRef<HTMLDivElement>(null);

  const zoomManager = React.useMemo(() => {
    if (!zoomEnabled) return null;
    return new ZoomManager((zoomTransform: ZoomTransform) => {
      setState(prev => ({ ...prev, zoomTransform }));
    });
  }, [zoomEnabled]);

  const zoomManagerRef = React.useRef<ZoomManager | null>(zoomManager);
  zoomManagerRef.current = zoomManager;

  // Single useMemo: derive className factory directly from classNamePrefix
  const getClassName = React.useMemo(
    () => (name: string) => `${classNamePrefix} ${classNamePrefix}-Digraph--${name}`,
    [classNamePrefix]
  );

  const getGlobalId = React.useCallback((name: string) => `${baseId}--${name}`, [baseId]);

  const zoomTransformRef = React.useRef(state.zoomTransform);
  zoomTransformRef.current = state.zoomTransform;

  const getZoomTransform = React.useCallback(() => zoomTransformRef.current, []);

  const renderUtils: TRendererUtils = React.useMemo(
    () => ({
      getGlobalId,
      getZoomTransform,
    }),
    [getGlobalId, getZoomTransform]
  );

  // Callbacks
  const onLayoutDone = React.useCallback((result: TCancelled | TLayoutDone<T, U>) => {
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
    if (zoomManagerRef.current) {
      // Use the actual graph size directly from layout
      zoomManagerRef.current.setContentSize(layoutGraph);
    }
  }, []);

  const setSizeVertices = React.useCallback(
    (senderKey: string, sizeVertices: TSizeVertex<T>[]) => {
      if (senderKey !== measurableNodesKey) {
        const values = `expected ${JSON.stringify(measurableNodesKey)}, received ${JSON.stringify(
          senderKey
        )}`;
        throw new Error(`Key mismatch for measuring nodes; ${values}`);
      }
      setState(prev => ({ ...prev, sizeVertices, layoutPhase: ELayoutPhase.CalcPositions }));
      const { layout } = layoutManager.getLayout(edges, sizeVertices);
      layout.then(onLayoutDone);
      // TODO: In the future, it may be useful to draw the nodes in the correct
      // position before the edges are drawn — i.e. layout before CalcPositions
      // is done. To do this, vertices with a size from sizeVertices would need
      // to be drawn at their current position (0, 0 initially).
    },
    [edges, layoutManager, measurableNodesKey, onLayoutDone]
  );

  // Plain function — no useCallback needed since it depends on state/renderUtils/topLayers
  // which change on every layout phase update and zoom event, so memoization provides no benefit.
  function renderLayers() {
    const { sizeVertices: _, ...partialGraphState } = state;
    const graphState = {
      ...partialGraphState,
      renderUtils,
    };
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
  }

  // Effects
  React.useEffect(() => {
    const { current } = rootRef;
    if (zoomManager && current) {
      zoomManager.setElement(current);
    }
    // Cleanup: detach all d3-zoom listeners when zoomManager changes (e.g. zoom
    // prop toggled false) or when the component unmounts, so prior handlers do
    // not remain active on the DOM element.
    return () => {
      if (zoomManager) {
        zoomManager.dispose();
      }
    };
  }, [zoomManager]);

  // Render
  const builtinStyle = zoomEnabled ? WRAPPER_STYLE_ZOOM : WRAPPER_STYLE;
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
        {renderLayers()}
      </div>
      {/* zoomManager is non-null iff zoomEnabled is true, so the zoomEnabled check is redundant */}
      {minimapEnabled && zoomManager && (
        <MiniMap className={minimapClassName} classNamePrefix={classNamePrefix} {...zoomManager.getProps()} />
      )}
    </div>
  );
}

type TDigraphComponent = typeof Digraph & {
  propsFactories: typeof propsFactories;
  scaleProperty: typeof scaleProperty;
};

// React.memo erases generic type parameters <T, U> — callers using
// <Digraph<MyNode, MyEdge> .../> will lose type safety. This is a known
// React limitation with generic components and React.memo. The cast is
// intentional; the underlying function still enforces types correctly.
const DigraphMemo = React.memo(Digraph) as unknown as TDigraphComponent;

// Attach static properties to the memoized component
DigraphMemo.propsFactories = propsFactories;
DigraphMemo.scaleProperty = scaleProperty;

export default DigraphMemo;
