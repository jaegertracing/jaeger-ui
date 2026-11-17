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

type TLayoutInputs<T, U> = Pick<TDigraphProps<T, U>, 'edges' | 'layoutManager' | 'measurableNodesKey'>;

const WRAPPER_STYLE_ZOOM: React.CSSProperties = {
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
};

const WRAPPER_STYLE: React.CSSProperties = {
  position: 'relative',
};

const getIdentityZoomTransform = () => zoomIdentity;

let idCounter = 0;

const propsFactories: Record<string, TFromGraphStateFn<unknown, unknown>> = {
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

  const [baseId] = React.useState(() => `plexus--Digraph--${idCounter++}`);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const activeRef = React.useRef(false);
  const layoutGraphRef = React.useRef(state.layoutGraph);
  const layoutInputsRef = React.useRef<TLayoutInputs<T, U>>({ edges, layoutManager, measurableNodesKey });
  const needsContentSizeRef = React.useRef(false);

  // ZoomManager is created once, so its callback must remain stable for the lifetime of this component.
  const onZoomUpdated = React.useCallback((zoomTransform: ZoomTransform) => {
    setState(previousState =>
      previousState.zoomTransform === zoomTransform ? previousState : { ...previousState, zoomTransform }
    );
  }, []);
  const [zoomManager] = React.useState(() => (zoomEnabled ? new ZoomManager(onZoomUpdated) : null));

  // Child measurements run in passive effects. Syncing here keeps this data current without changing the
  // callback identity passed to MeasurableNodesLayer.
  React.useLayoutEffect(() => {
    layoutGraphRef.current = state.layoutGraph;
    layoutInputsRef.current = { edges, layoutManager, measurableNodesKey };
  }, [edges, layoutManager, measurableNodesKey, state.layoutGraph]);

  React.useLayoutEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const getClassName = React.useMemo(() => {
    const prefix = classNamePrefix || '';
    return (name: string) => `${prefix} ${prefix}-Digraph--${name}`;
  }, [classNamePrefix]);
  const getGlobalId = React.useCallback((name: string) => `${baseId}--${name}`, [baseId]);
  const getZoomTransform = zoomManager ? zoomManager.getTransform : getIdentityZoomTransform;

  const renderUtils: TRendererUtils = React.useMemo(
    () => ({ getGlobalId, getZoomTransform }),
    [getGlobalId, getZoomTransform]
  );

  const onLayoutDone = React.useCallback(
    (result: TCancelled | TLayoutDone<T, U>) => {
      if (result.isCancelled) {
        return;
      }
      const { edges: layoutEdges, graph: layoutGraph, vertices: layoutVertices } = result;
      setState(previousState => ({
        ...previousState,
        layoutEdges,
        layoutGraph,
        layoutPhase: ELayoutPhase.Done,
        layoutVertices,
      }));
      if (activeRef.current) {
        zoomManager?.setContentSize(layoutGraph);
      } else {
        needsContentSizeRef.current = true;
      }
    },
    [zoomManager]
  );

  const setSizeVertices = React.useCallback(
    (senderKey: string, sizeVertices: TSizeVertex<T>[]) => {
      const {
        edges: currentEdges,
        layoutManager: currentLayoutManager,
        measurableNodesKey: expectedKey,
      } = layoutInputsRef.current;
      if (senderKey !== expectedKey) {
        const values = `expected ${JSON.stringify(expectedKey)}, received ${JSON.stringify(senderKey)}`;
        throw new Error(`Key mismatch for measuring nodes; ${values}`);
      }
      setState(previousState => ({
        ...previousState,
        sizeVertices,
        layoutPhase: ELayoutPhase.CalcPositions,
      }));
      const { layout } = currentLayoutManager.getLayout(currentEdges, sizeVertices);
      layout.then(onLayoutDone);
      // Future support could render sized vertices at their current positions before edge layout completes.
      // That would use the `positions` promise returned by getLayout alongside the final `layout` promise.
    },
    [onLayoutDone]
  );

  const renderLayers = () => {
    const { sizeVertices: _, ...partialGraphState } = state;
    const graphState = { ...partialGraphState, renderUtils };
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
  };

  React.useLayoutEffect(() => {
    const { current } = rootRef;
    if (zoomManager && current) {
      zoomManager.setElement(current);
      if (needsContentSizeRef.current && layoutGraphRef.current) {
        zoomManager.setContentSize(layoutGraphRef.current);
        needsContentSizeRef.current = false;
      }
    }
    return () => {
      zoomManager?.dispose();
    };
  }, [zoomManager]);

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
        {renderLayers()}
      </div>
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

const DigraphMemo = React.memo(Digraph) as unknown as TDigraphComponent;

DigraphMemo.propsFactories = propsFactories;
DigraphMemo.scaleProperty = scaleProperty;

export default DigraphMemo;
