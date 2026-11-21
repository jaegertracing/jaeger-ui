// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Digraph from './index';
import { TLayer } from './types';
import LayoutManager from '../LayoutManager';
import { TEdge, TLayoutDone, TVertex } from '../types';
import ZoomManager, { zoomIdentity } from '../zoom/ZoomManager';

const vertices: TVertex<{ name: string }>[] = [
  { key: 'a', name: 'a' },
  { key: 'b', name: 'b' },
];
const edges: TEdge[] = [{ from: 'a', to: 'b' }];

const renderNodeLayer: TLayer = {
  key: 'test-layer',
  layerType: 'html',
  renderNode: () => <div />,
};

const renderEdgeLayer: TLayer = {
  edges: true,
  key: 'edges',
  layerType: 'svg',
};

const createMeasurableLayer = (key = 'nodes') =>
  ({
    key,
    layerType: 'html',
    measurable: true,
    measureNode: () => ({ height: 10, width: 10 }),
    renderNode: () => <div />,
  }) as TLayer;

const createLayoutManager = () => ({
  getLayout: vi.fn(() => ({
    layout: new Promise<never>(() => {}),
    positions: new Promise<never>(() => {}),
  })),
});

type TTestLayoutDone = TLayoutDone<{ name: string }, unknown>;

const completedLayout: TTestLayoutDone = {
  edges: [
    {
      edge: edges[0],
      pathPoints: [
        [0, 0],
        [20, 0],
      ],
    },
  ],
  graph: { height: 10, scale: 1, width: 20 },
  isCancelled: false,
  vertices: vertices.map((vertex, index) => ({
    height: 10,
    left: index * 20,
    top: 0,
    vertex,
    width: 10,
  })),
};

const createPendingLayoutManager = () => {
  let resolveLayout: (result: TTestLayoutDone) => void = () => {};
  const layout = new Promise<TTestLayoutDone>(resolve => {
    resolveLayout = resolve;
  });
  return {
    layoutManager: {
      getLayout: vi.fn(() => ({ layout, positions: new Promise<never>(() => {}) })),
    },
    resolveLayout,
  };
};

const createTransitionLayoutManager = () => {
  let completeLayout: (result: TTestLayoutDone) => void = () => {};
  const layout = {
    then: (onFulfilled: (result: TTestLayoutDone) => void) => {
      completeLayout = onFulfilled;
      return layout;
    },
  } as unknown as Promise<TTestLayoutDone>;
  return {
    completeLayout: (result: TTestLayoutDone) => completeLayout(result),
    layoutManager: {
      getLayout: vi.fn(() => ({ layout, positions: new Promise<never>(() => {}) })),
    },
  };
};

describe('Digraph', () => {
  it('preserves the static helpers consumed by graph views', () => {
    expect(Digraph.propsFactories.classNameIsSmall).toBeTypeOf('function');
    expect(Digraph.propsFactories.scaleOpacity).toBeTypeOf('function');
    expect(Digraph.scaleProperty.opacity).toBe(Digraph.propsFactories.scaleOpacity);
  });

  it('renders an empty graph with default props', () => {
    const layoutManager = createLayoutManager();
    const { container } = render(
      <Digraph
        edges={[]}
        layers={[renderNodeLayer]}
        layoutManager={layoutManager as unknown as LayoutManager}
        measurableNodesKey="nodes"
        vertices={[]}
      />
    );

    expect(container.querySelector('.plexus-Digraph')).not.toBeNull();
  });

  it('starts layout after measurable nodes report their sizes', async () => {
    const layoutManager = createLayoutManager();
    render(
      <Digraph
        edges={edges}
        layers={[createMeasurableLayer()]}
        layoutManager={layoutManager as unknown as LayoutManager}
        measurableNodesKey="nodes"
        vertices={vertices}
      />
    );

    await waitFor(() => {
      expect(layoutManager.getLayout).toHaveBeenCalledWith(edges, expect.any(Array));
    });
  });

  it('rejects measurements from a layer other than the configured one', () => {
    const layoutManager = createLayoutManager();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() =>
        render(
          <Digraph
            edges={edges}
            layers={[createMeasurableLayer('wrong-key')]}
            layoutManager={layoutManager as unknown as LayoutManager}
            measurableNodesKey="nodes"
            vertices={vertices}
          />
        )
      ).toThrow(/Key mismatch for measuring nodes/);
    } finally {
      consoleError.mockRestore();
    }
  });

  it('renders the minimap and disposes zoom listeners on unmount', () => {
    const layoutManager = createLayoutManager();
    const dispose = vi.spyOn(ZoomManager.prototype, 'dispose');

    try {
      const { container, unmount } = render(
        <Digraph
          edges={[]}
          layers={[renderNodeLayer]}
          layoutManager={layoutManager as unknown as LayoutManager}
          measurableNodesKey="nodes"
          minimap
          vertices={[]}
          zoom
        />
      );

      expect(container.querySelector('.plexus-MiniMap')).not.toBeNull();

      unmount();
      expect(dispose).toHaveBeenCalledTimes(1);
    } finally {
      dispose.mockRestore();
    }
  });

  it('resets the current transform before the first layout completes', () => {
    const layoutManager = createLayoutManager();
    const setElement = vi.spyOn(ZoomManager.prototype, 'setElement');

    try {
      render(
        <Digraph
          edges={[]}
          layers={[renderNodeLayer]}
          layoutManager={layoutManager as unknown as LayoutManager}
          measurableNodesKey="nodes"
          vertices={[]}
          zoom
        />
      );
      const zoomManager = setElement.mock.instances[0] as ZoomManager;

      act(() => zoomManager.zoomIn());
      expect(zoomManager.getTransform().k).toBe(1.2);

      act(() => zoomManager.resetZoom());
      expect(zoomManager.getTransform()).toBe(zoomIdentity);
      expect(zoomManager.getProps()).toMatchObject({ k: 1, x: 0, y: 0 });

      act(() => zoomManager.zoomIn());
      expect(zoomManager.getTransform().k).toBe(1.2);
    } finally {
      setElement.mockRestore();
    }
  });

  it('renders edges and sizes zoom when layout completes', async () => {
    const { layoutManager, resolveLayout } = createPendingLayoutManager();
    const setContentSize = vi.spyOn(ZoomManager.prototype, 'setContentSize');

    try {
      const { container } = render(
        <Digraph
          edges={edges}
          layers={[renderEdgeLayer, createMeasurableLayer()]}
          layoutManager={layoutManager as unknown as LayoutManager}
          measurableNodesKey="nodes"
          vertices={vertices}
          zoom
        />
      );
      await waitFor(() => expect(layoutManager.getLayout).toHaveBeenCalledTimes(1));

      await act(async () => resolveLayout(completedLayout));

      await waitFor(() => {
        expect(container.querySelector('.plexus-Digraph--SvgEdgesLayer')).not.toBeNull();
      });
      expect(setContentSize).toHaveBeenCalledWith(completedLayout.graph);
    } finally {
      setContentSize.mockRestore();
    }
  });

  it('restores completed layout and zoom size after Activity reveals the graph', async () => {
    const { layoutManager, resolveLayout } = createPendingLayoutManager();
    const measurableLayer = createMeasurableLayer();
    const setContentSize = vi.spyOn(ZoomManager.prototype, 'setContentSize');

    try {
      const { container, rerender } = render(
        <React.Activity mode="visible">
          <Digraph
            edges={edges}
            layers={[renderEdgeLayer, measurableLayer]}
            layoutManager={layoutManager as unknown as LayoutManager}
            measurableNodesKey="nodes"
            vertices={vertices}
            zoom
          />
        </React.Activity>
      );
      await waitFor(() => expect(layoutManager.getLayout).toHaveBeenCalledTimes(1));

      rerender(
        <React.Activity mode="hidden">
          <Digraph
            edges={edges}
            layers={[renderEdgeLayer, measurableLayer]}
            layoutManager={layoutManager as unknown as LayoutManager}
            measurableNodesKey="nodes"
            vertices={vertices}
            zoom
          />
        </React.Activity>
      );
      await act(async () => resolveLayout(completedLayout));
      expect(setContentSize).not.toHaveBeenCalled();

      rerender(
        <React.Activity mode="visible">
          <Digraph
            edges={edges}
            layers={[renderEdgeLayer, measurableLayer]}
            layoutManager={layoutManager as unknown as LayoutManager}
            measurableNodesKey="nodes"
            vertices={vertices}
            zoom
          />
        </React.Activity>
      );

      await waitFor(() => {
        expect(container.querySelector('.plexus-Digraph--SvgEdgesLayer')).not.toBeNull();
      });
      expect(setContentSize).toHaveBeenCalledWith(completedLayout.graph);
    } finally {
      setContentSize.mockRestore();
    }
  });

  it('restores zoom size when revealed before a hidden layout state update commits', async () => {
    const { completeLayout, layoutManager } = createTransitionLayoutManager();
    const measurableLayer = createMeasurableLayer();
    const setElement = vi.spyOn(ZoomManager.prototype, 'setElement');

    const renderActivity = (mode: 'hidden' | 'visible') => (
      <React.Activity mode={mode}>
        <Digraph
          edges={edges}
          layers={[renderEdgeLayer, measurableLayer]}
          layoutManager={layoutManager as unknown as LayoutManager}
          measurableNodesKey="nodes"
          minimap
          vertices={vertices}
          zoom
        />
      </React.Activity>
    );

    try {
      const { container, rerender } = render(renderActivity('visible'));
      await waitFor(() => expect(layoutManager.getLayout).toHaveBeenCalledTimes(1));
      const zoomManager = setElement.mock.instances[0] as ZoomManager;

      rerender(renderActivity('hidden'));
      act(() => {
        React.startTransition(() => completeLayout(completedLayout));
        rerender(renderActivity('visible'));
      });

      await waitFor(() => {
        expect(container.querySelector('.plexus-Digraph--SvgEdgesLayer')).not.toBeNull();
        expect(zoomManager.getProps()).toMatchObject({ contentHeight: 10, contentWidth: 20 });
      });
    } finally {
      setElement.mockRestore();
    }
  });

  it('preserves zoom size and transform when Activity hides an already completed graph', async () => {
    const { layoutManager, resolveLayout } = createPendingLayoutManager();
    const measurableLayer = createMeasurableLayer();
    const setElement = vi.spyOn(ZoomManager.prototype, 'setElement');

    const renderActivity = (mode: 'hidden' | 'visible') => (
      <React.Activity mode={mode}>
        <Digraph
          edges={edges}
          layers={[renderEdgeLayer, measurableLayer]}
          layoutManager={layoutManager as unknown as LayoutManager}
          measurableNodesKey="nodes"
          minimap
          vertices={vertices}
          zoom
        />
      </React.Activity>
    );

    try {
      const { container, rerender } = render(renderActivity('visible'));
      await waitFor(() => expect(layoutManager.getLayout).toHaveBeenCalledTimes(1));
      await act(async () => resolveLayout(completedLayout));
      await waitFor(() => {
        expect(container.querySelector('.plexus-Digraph--SvgEdgesLayer')).not.toBeNull();
      });
      const zoomManager = setElement.mock.instances[0] as ZoomManager;
      const userTransform = zoomIdentity.translate(42, 17).scale(2.5);
      (zoomManager as unknown as { currentTransform: typeof userTransform }).currentTransform = userTransform;
      expect(zoomManager.getProps()).toMatchObject({ contentHeight: 10, contentWidth: 20 });

      rerender(renderActivity('hidden'));
      rerender(renderActivity('visible'));

      await waitFor(() => expect(setElement).toHaveBeenCalledTimes(2));
      expect(setElement.mock.calls[1][0]).toBe(setElement.mock.calls[0][0]);
      expect(zoomManager.getProps()).toMatchObject({
        contentHeight: 10,
        contentWidth: 20,
        k: 2.5,
        x: 42,
        y: 17,
      });
      await waitFor(() => {
        expect(
          container.querySelector('.plexus-Digraph--SvgLayer--transformer')?.getAttribute('transform')
        ).toBe('translate(42,17) scale(2.5)');
      });
      expect(container.querySelector('.plexus-Digraph--SvgEdgesLayer')).not.toBeNull();
      expect(container.querySelector('.plexus-MiniMap')).not.toBeNull();
    } finally {
      setElement.mockRestore();
    }
  });

  it('restores zoom size when a pending layout resolves under Suspense', async () => {
    const { layoutManager, resolveLayout } = createPendingLayoutManager();
    const measurableLayer = createMeasurableLayer();
    const setElement = vi.spyOn(ZoomManager.prototype, 'setElement');
    const suspensePromise = new Promise<never>(() => {});

    const Suspender = ({ suspend }: { suspend: boolean }) => {
      if (suspend) {
        throw suspensePromise;
      }
      return null;
    };
    const renderSuspense = (suspend: boolean) => (
      <React.Suspense fallback={<div data-testid="suspense-fallback" />}>
        <Digraph
          edges={edges}
          layers={[renderEdgeLayer, measurableLayer]}
          layoutManager={layoutManager as unknown as LayoutManager}
          measurableNodesKey="nodes"
          minimap
          vertices={vertices}
          zoom
        />
        <Suspender suspend={suspend} />
      </React.Suspense>
    );

    try {
      const { container, rerender } = render(renderSuspense(false));
      await waitFor(() => expect(layoutManager.getLayout).toHaveBeenCalledTimes(1));

      rerender(renderSuspense(true));
      await waitFor(() =>
        expect(container.querySelector('[data-testid="suspense-fallback"]')).not.toBeNull()
      );
      await act(async () => resolveLayout(completedLayout));
      const zoomManager = setElement.mock.instances[0] as ZoomManager;
      expect(zoomManager.getProps()).toMatchObject({ contentHeight: 1, contentWidth: 1 });

      rerender(renderSuspense(false));

      await waitFor(() => {
        expect(container.querySelector('.plexus-Digraph--SvgEdgesLayer')).not.toBeNull();
        expect(zoomManager.getProps()).toMatchObject({ contentHeight: 10, contentWidth: 20 });
      });
      expect(setElement).toHaveBeenCalledTimes(2);
      expect(container.querySelector('.plexus-MiniMap')).not.toBeNull();
    } finally {
      setElement.mockRestore();
    }
  });

  it('skips zoom updates when layout completes after unmount', async () => {
    const { layoutManager, resolveLayout } = createPendingLayoutManager();
    const setContentSize = vi.spyOn(ZoomManager.prototype, 'setContentSize');

    try {
      const { unmount } = render(
        <Digraph
          edges={edges}
          layers={[createMeasurableLayer()]}
          layoutManager={layoutManager as unknown as LayoutManager}
          measurableNodesKey="nodes"
          vertices={vertices}
          zoom
        />
      );
      await waitFor(() => expect(layoutManager.getLayout).toHaveBeenCalledTimes(1));
      unmount();

      await act(async () => {
        resolveLayout({
          edges: [],
          graph: { height: 10, scale: 1, width: 10 },
          isCancelled: false,
          vertices: [],
        });
      });

      expect(setContentSize).not.toHaveBeenCalled();
    } finally {
      setContentSize.mockRestore();
    }
  });
});
