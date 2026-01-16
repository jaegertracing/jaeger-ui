// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { memo, useEffect, useMemo, useRef } from 'react';
import memoize from 'memoize-one';
import { Digraph, LayoutManager } from '@jaegertracing/plexus';
import { TSetProps, TFromGraphStateFn, TDefEntry, TLayer } from '@jaegertracing/plexus/lib/Digraph/types';
import { TEdge } from '@jaegertracing/plexus/lib/types';
import TNonEmptyArray from '@jaegertracing/plexus/lib/types/TNonEmptyArray';

import { getNodeRenderer, measureNode } from './DdgNodeContent';
import getNodeRenderers from './getNodeRenderers';
import getSetOnEdge from './getSetOnEdge';
import {
  ECheckedStatus,
  EDdgDensity,
  EDirection,
  EViewModifier,
  PathElem,
  TDdgVertex,
} from '../../../model/ddg/types';

import './index.css';

type TProps = {
  baseUrl: string;
  density: EDdgDensity;
  edges: TEdge[];
  edgesViewModifiers: Map<string, number>;
  extraUrlArgs?: { [key: string]: unknown };
  focusPathsThroughVertex: (vertexKey: string) => void;
  getGenerationVisibility: (vertexKey: string, direction: EDirection) => ECheckedStatus | null;
  getVisiblePathElems: (vertexKey: string) => PathElem[] | undefined;
  hideVertex: (vertexKey: string) => void;
  selectVertex: (selectedVertex: TDdgVertex) => void;
  setOperation: (operation: string) => void;
  setViewModifier: (visIndices: number[], viewModifier: EViewModifier, enable: boolean) => void;
  uiFindMatches: Set<string> | undefined;
  updateGenerationVisibility: (vertexKey: string, direction: EDirection) => void;
  vertices: TDdgVertex[];
  verticesViewModifiers: Map<string, number>;
};

// exported for tests
// The dichotomy between w/ & w/o VMs assumes that any edge VM neccesitates unmodified edges are de-emphasized
export const setOnEdgesContainer: Record<string, TSetProps<TFromGraphStateFn<unknown, unknown>>> = {
  withViewModifiers: [{ className: 'Ddg--Edges is-withViewModifiers' }],
  withoutViewModifiers: [Digraph.propsFactories.scaleStrokeOpacityStrongest, { className: 'Ddg--Edges' }],
};

// exported for tests
// The dichotomy between w/ & w/o VMs assumes that any vertex VM makes unmodified vertices de-emphasized
export const setOnVectorBorderContainerWithViewModifiers: TSetProps<TFromGraphStateFn<TDdgVertex, unknown>> =
  {
    className: 'DdgVectorBorders is-withViewModifiers',
  };

const edgesDefs: TNonEmptyArray<TDefEntry<TDdgVertex, unknown>> = [
  { localId: 'arrow' },
  { localId: 'arrow-hovered', setOnEntry: { className: 'Ddg--Arrow is-pathHovered' } },
];

const Graph = ({
  baseUrl,
  density,
  edges,
  edgesViewModifiers,
  extraUrlArgs,
  focusPathsThroughVertex,
  getGenerationVisibility,
  getVisiblePathElems,
  hideVertex,
  selectVertex,
  setOperation,
  setViewModifier,
  uiFindMatches,
  updateGenerationVisibility,
  vertices,
  verticesViewModifiers,
}: TProps) => {
  // Stable layout manager instance persists across renders
  const layoutManagerRef = useRef<LayoutManager | null>(null);
  if (!layoutManagerRef.current) {
    layoutManagerRef.current = new LayoutManager({
      nodesep: 0.55,
      ranksep: 1.5,
      rankdir: 'TB',
      shape: 'circle',
      splines: 'polyline',
      useDotEdges: true,
    });
  }
  const layoutManager = layoutManagerRef.current;

  // Empty set for fallback when uiFindMatches is undefined
  const emptyFindSetRef = useRef(new Set<string>());

  // Memoized functions using refs to avoid recreating memoize instances
  // Use lazy initialization pattern to prevent unnecessary object creation on each render
  const memoizedFnsRef = useRef<{
    getNodeRenderers: typeof getNodeRenderers;
    getNodeContentRenderer: typeof getNodeRenderer;
    getSetOnEdge: typeof getSetOnEdge;
  } | null>(null);

  if (!memoizedFnsRef.current) {
    memoizedFnsRef.current = {
      getNodeRenderers: memoize(getNodeRenderers),
      getNodeContentRenderer: memoize(getNodeRenderer),
      getSetOnEdge: memoize(getSetOnEdge),
    };
  }

  // Cleanup layout manager on unmount
  useEffect(() => {
    return () => {
      layoutManager.stopAndRelease();
    };
    // layoutManager is a stable ref that never changes, so empty deps ensures cleanup only on unmount
  }, []);

  // Non-null assertion is safe here because we initialize above
  const {
    getNodeRenderers: memoGetNodeRenderers,
    getNodeContentRenderer,
    getSetOnEdge: memoGetSetOnEdge,
  } = memoizedFnsRef.current!;

  // Calculate layers with nodeRenderers inside useMemo to avoid redundant memoization.
  // This ensures memoGetNodeRenderers is only called when dependencies actually change,
  // rather than on every render (even with memoize-one caching).
  const layers = useMemo(() => {
    const nodeRenderers = memoGetNodeRenderers(
      uiFindMatches || emptyFindSetRef.current,
      verticesViewModifiers
    );
    return [
      {
        key: 'nodes/find-emphasis/vector-color-band',
        layerType: 'svg' as const,
        renderNode: nodeRenderers.vectorFindColorBand,
      },
      {
        key: 'nodes/find-emphasis/html',
        layerType: 'html' as const,
        renderNode: nodeRenderers.htmlEmphasis,
      },
      {
        key: 'nodes/vector-border',
        layerType: 'svg' as const,
        renderNode: nodeRenderers.vectorBorder,
        setOnContainer: verticesViewModifiers.size
          ? setOnVectorBorderContainerWithViewModifiers
          : Digraph.propsFactories.scaleStrokeOpacityStrongest,
      },
      {
        key: 'edges',
        layerType: 'svg' as const,
        edges: true,
        defs: edgesDefs,
        markerEndId: 'arrow',
        setOnContainer: edgesViewModifiers.size
          ? setOnEdgesContainer.withViewModifiers
          : setOnEdgesContainer.withoutViewModifiers,
        setOnEdge: memoGetSetOnEdge(edgesViewModifiers),
      },
      {
        key: 'nodes/content',
        layerType: 'html' as const,
        measurable: true,
        measureNode,
        renderNode: getNodeContentRenderer({
          baseUrl,
          density,
          extraUrlArgs,
          focusPathsThroughVertex,
          getGenerationVisibility,
          getVisiblePathElems,
          hideVertex,
          selectVertex,
          setOperation,
          setViewModifier,
          updateGenerationVisibility,
        }),
      },
    ] as TNonEmptyArray<TLayer<TDdgVertex, unknown>>;
  }, [
    // Data dependencies that trigger recalculation
    uiFindMatches,
    verticesViewModifiers,
    edgesViewModifiers,
    baseUrl,
    density,
    extraUrlArgs,
    focusPathsThroughVertex,
    getGenerationVisibility,
    getVisiblePathElems,
    hideVertex,
    selectVertex,
    setOperation,
    setViewModifier,
    updateGenerationVisibility,
    // memoGetNodeRenderers, memoGetSetOnEdge, getNodeContentRenderer are stable refs
    // stored in useRef - they never change, so excluded from deps
  ]);

  return (
    <Digraph<TDdgVertex>
      minimap
      zoom
      minimapClassName="u-miniMap"
      layoutManager={layoutManager}
      edges={edges}
      vertices={vertices}
      measurableNodesKey="nodes/content"
      layers={layers}
    />
  );
};

// memo provides shallow comparison equivalent to PureComponent
export default memo(Graph);
