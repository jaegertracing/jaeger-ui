// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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

const Digraph = <T = unknown, U = unknown>({
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
}: TDigraphProps<T, U>) => {
  const baseIdRef = React.useRef(`plexus--Digraph--${idCounter++}`);
  const baseId = baseIdRef.current;

  const makeClassNameFactory = React.useRef(
    memoizeOne((prefix: string) => (name: string) => `${prefix} ${prefix}-Digraph--${name}`)
  ).current;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const zoomTransformRef = React.useRef<ZoomTransform>(zoomIdentity);

  const onZoomUpdated = React.useCallback((zoomTransform: ZoomTransform) => {
    setState(prev => ({ ...prev, zoomTransform }));
  }, []);

  const zoomManagerRef = React.useRef<ZoomManager | null>(
    zoomEnabled ? new ZoomManager(onZoomUpdated) : null
  );

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

  React.useEffect(() => {
    zoomTransformRef.current = state.zoomTransform;
  }, [state.zoomTransform]);

  const getClassName = makeClassNameFactory(classNamePrefix);

  const getGlobalId = React.useCallback((name: string) => `${baseId}--${name}`, [baseId]);

  const getZoomTransform = React.useCallback(() => zoomTransformRef.current, []);

  const renderUtils = React.useMemo<TRendererUtils>(
    () => ({
      getGlobalId,
      getZoomTransform,
    }),
    [getGlobalId, getZoomTransform]
  );

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
    },
    [edges, layoutManager, measurableNodesKey, onLayoutDone]
  );

  // Handle zoom manager lifecycle when zoomEnabled changes after mount
  React.useEffect(() => {
    if (zoomEnabled) {
      if (!zoomManagerRef.current) {
        zoomManagerRef.current = new ZoomManager(onZoomUpdated);
      }
      if (rootRef.current && zoomManagerRef.current) {
        zoomManagerRef.current.setElement(rootRef.current);
      }
    } else {
      // Explicitly clean up when zoom is disabled
      if (zoomManagerRef.current) {
        const selection = (zoomManagerRef.current as any).selection;
        if (selection) {
          selection.on('.zoom', null);
        }
        zoomManagerRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (zoomManagerRef.current) {
        const selection = (zoomManagerRef.current as any).selection;
        if (selection) {
          selection.on('.zoom', null);
        }
        zoomManagerRef.current = null;
      }
    };
  }, [zoomEnabled, onZoomUpdated]);

  const renderedLayers = React.useMemo(() => {
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
  }, [state, renderUtils, topLayers, getClassName, setSizeVertices]);

  const builtinStyle = zoomManagerRef.current ? WRAPPER_STYLE_ZOOM : WRAPPER_STYLE;
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
      {minimapEnabled && zoomManagerRef.current && (
        <MiniMap
          className={minimapClassName}
          classNamePrefix={classNamePrefix}
          {...zoomManagerRef.current.getProps()}
        />
      )}
    </div>
  );
};

function arePropsEqual<T, U>(prevProps: TDigraphProps<T, U>, nextProps: TDigraphProps<T, U>): boolean {
  if (
    prevProps.className !== nextProps.className ||
    prevProps.classNamePrefix !== nextProps.classNamePrefix ||
    prevProps.measurableNodesKey !== nextProps.measurableNodesKey ||
    prevProps.minimap !== nextProps.minimap ||
    prevProps.minimapClassName !== nextProps.minimapClassName ||
    prevProps.zoom !== nextProps.zoom ||
    prevProps.layoutManager !== nextProps.layoutManager
  ) {
    return false;
  }

  if (prevProps.style !== nextProps.style) {
    return false;
  }

  if (prevProps.setOnGraph !== nextProps.setOnGraph) {
    return false;
  }

  if (
    prevProps.edges !== nextProps.edges ||
    prevProps.vertices !== nextProps.vertices ||
    prevProps.layers !== nextProps.layers
  ) {
    return false;
  }

  return true;
}

const MemoDigraph = React.memo(Digraph, arePropsEqual) as unknown as (<T = unknown, U = unknown>(
  props: TDigraphProps<T, U>
) => React.ReactElement) & {
  propsFactories: Record<string, TFromGraphStateFn<any, any>>;
  scaleProperty: typeof scaleProperty;
};

MemoDigraph.propsFactories = propsFactories;
MemoDigraph.scaleProperty = scaleProperty;

export default MemoDigraph;
