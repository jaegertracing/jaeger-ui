// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, render } from '@testing-library/react';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  measurableNodesLayer: vi.fn((_props: unknown) => undefined),
  measurement: null as { senderKey: string; sizeVertices: unknown[] } | null,
}));

vi.mock('./MeasurableNodesLayer', async () => {
  const ReactModule = await import('react');
  return {
    default: function MockMeasurableNodesLayer(props: unknown) {
      mocks.measurableNodesLayer(props);
      ReactModule.useEffect(() => {
        const measurement = mocks.measurement;
        if (measurement) {
          mocks.measurement = null;
          const { setSizeVertices } = props as {
            setSizeVertices: (senderKey: string, sizeVertices: unknown[]) => void;
          };
          setSizeVertices(measurement.senderKey, measurement.sizeVertices);
        }
      }, [props]);
      return null;
    },
  };
});

import Digraph from './index';
import { TLayer } from './types';
import LayoutManager from '../LayoutManager';
import { TEdge, TSizeVertex, TVertex } from '../types';

const edges: TEdge[] = [{ from: 'a', to: 'b' }];
const vertices: TVertex<{ name: string }>[] = [
  { key: 'a', name: 'a' },
  { key: 'b', name: 'b' },
];
const layer: TLayer = {
  key: 'nodes',
  layerType: 'html',
  measurable: true,
  renderNode: () => null,
};
const createLayoutManager = () => ({
  getLayout: vi.fn(() => ({
    layout: new Promise<never>(() => {}),
    positions: new Promise<never>(() => {}),
  })),
});

type TSetSizeVertices = (senderKey: string, sizeVertices: TSizeVertex<{ name: string }>[]) => void;

type TMeasuredLayerProps = {
  getClassName: (name: string) => string;
  graphState: { renderUtils: unknown };
  setSizeVertices: TSetSizeVertices;
};

const getLatestLayerProps = () => {
  const calls = mocks.measurableNodesLayer.mock.calls;
  return calls[calls.length - 1][0] as TMeasuredLayerProps;
};

describe('Digraph callback stability', () => {
  beforeEach(() => {
    mocks.measurableNodesLayer.mockClear();
    mocks.measurement = null;
  });

  it('keeps render helpers stable while using the latest layout inputs', () => {
    const initialLayoutManager = createLayoutManager();
    const { rerender } = render(
      <Digraph
        edges={edges}
        layers={[layer]}
        layoutManager={initialLayoutManager as unknown as LayoutManager}
        measurableNodesKey="nodes"
        vertices={vertices}
        zoom
      />
    );
    const initialLayerProps = getLatestLayerProps();
    expect(mocks.measurableNodesLayer).toHaveBeenCalledTimes(1);
    const nextEdges: TEdge[] = [{ from: 'b', to: 'a' }];
    const nextLayoutManager = createLayoutManager();

    rerender(
      <Digraph
        edges={nextEdges}
        layers={[layer]}
        layoutManager={nextLayoutManager as unknown as LayoutManager}
        measurableNodesKey="nodes"
        vertices={vertices}
        zoom
      />
    );
    const updatedLayerProps = getLatestLayerProps();
    const sizeVertices: TSizeVertex<{ name: string }>[] = vertices.map(vertex => ({
      height: 10,
      vertex,
      width: 10,
    }));

    expect(updatedLayerProps.setSizeVertices).toBe(initialLayerProps.setSizeVertices);
    expect(updatedLayerProps.getClassName).toBe(initialLayerProps.getClassName);
    expect(updatedLayerProps.graphState.renderUtils).toBe(initialLayerProps.graphState.renderUtils);
    act(() => updatedLayerProps.setSizeVertices('nodes', sizeVertices));
    expect(nextLayoutManager.getLayout).toHaveBeenCalledWith(nextEdges, sizeVertices);
    expect(initialLayoutManager.getLayout).not.toHaveBeenCalled();
  });

  it('syncs layout inputs before child passive measurements', () => {
    const initialLayoutManager = createLayoutManager();
    const { rerender } = render(
      <Digraph
        edges={edges}
        layers={[layer]}
        layoutManager={initialLayoutManager as unknown as LayoutManager}
        measurableNodesKey="nodes"
        vertices={vertices}
      />
    );
    const nextEdges: TEdge[] = [{ from: 'b', to: 'a' }];
    const nextLayoutManager = createLayoutManager();
    const sizeVertices: TSizeVertex<{ name: string }>[] = vertices.map(vertex => ({
      height: 10,
      vertex,
      width: 10,
    }));
    mocks.measurement = { senderKey: 'nodes', sizeVertices };

    rerender(
      <Digraph
        edges={nextEdges}
        layers={[layer]}
        layoutManager={nextLayoutManager as unknown as LayoutManager}
        measurableNodesKey="nodes"
        vertices={vertices}
      />
    );

    expect(nextLayoutManager.getLayout).toHaveBeenCalledWith(nextEdges, sizeVertices);
    expect(initialLayoutManager.getLayout).not.toHaveBeenCalled();
  });
});
