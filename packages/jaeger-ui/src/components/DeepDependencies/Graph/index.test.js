// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Digraph, LayoutManager } from '@jaegertracing/plexus';

import Graph, { setOnEdgesContainer, setOnVectorBorderContainerWithViewModifiers } from './index';
import { EViewModifier } from '../../../model/ddg/types';

// Mock LayoutManager instance to track cleanup calls
const mockStopAndRelease = jest.fn();

jest.mock('@jaegertracing/plexus', () => ({
  Digraph: Object.assign(
    jest.fn(() => <div data-testid="digraph" />),
    {
      propsFactories: {
        scaleStrokeOpacityStrongest: { className: 'mock-scale-stroke-opacity' },
      },
    }
  ),
  LayoutManager: jest.fn().mockImplementation(() => ({
    stopAndRelease: mockStopAndRelease,
  })),
}));

jest.mock('./DdgNodeContent', () => ({
  getNodeRenderer: jest.fn(() => jest.fn()),
  measureNode: jest.fn(),
}));

jest.mock('./getNodeRenderers', () =>
  jest.fn(() => ({
    vectorFindColorBand: jest.fn(),
    htmlEmphasis: jest.fn(),
    vectorBorder: jest.fn(),
  }))
);

jest.mock('./getSetOnEdge', () => jest.fn(() => jest.fn()));

describe('<Graph />', () => {
  const vertices = [...new Array(10)].map((_, i) => ({ key: `key${i}` }));
  const edges = [
    {
      from: vertices[0].key,
      to: vertices[1].key,
    },
    {
      from: vertices[1].key,
      to: vertices[2].key,
    },
  ];

  const props = {
    baseUrl: '/test',
    density: 'default',
    edges,
    edgesViewModifiers: new Map(),
    focusPathsThroughVertex: jest.fn(),
    getGenerationVisibility: jest.fn(),
    getVisiblePathElems: jest.fn(),
    hideVertex: jest.fn(),
    selectVertex: jest.fn(),
    setOperation: jest.fn(),
    setViewModifier: jest.fn(),
    uiFindMatches: undefined,
    updateGenerationVisibility: jest.fn(),
    vertices,
    verticesViewModifiers: new Map(),
  };

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('creates layout manager with correct configuration', () => {
      render(<Graph {...props} />);
      expect(LayoutManager).toHaveBeenCalledWith({
        nodesep: 0.55,
        ranksep: 1.5,
        rankdir: 'TB',
        shape: 'circle',
        splines: 'polyline',
        useDotEdges: true,
      });
    });

    it('creates layout manager only once on multiple renders', () => {
      const { rerender } = render(<Graph {...props} />);
      const firstCallCount = LayoutManager.mock.calls.length;

      // Re-render with updated props
      rerender(<Graph {...props} edges={[...edges]} />);

      // LayoutManager should still only be called once (during initial render)
      expect(LayoutManager).toHaveBeenCalledTimes(firstCallCount);
    });
  });

  describe('render', () => {
    let digraphProps;

    beforeEach(() => {
      render(<Graph {...props} />);
      digraphProps = Digraph.mock.calls[Digraph.mock.calls.length - 1][0];
    });

    it('renders provided edges and vertices', () => {
      expect(digraphProps.edges).toEqual(edges);
      expect(digraphProps.vertices).toEqual(vertices);
    });

    it('renders digraph with correct props', () => {
      expect(digraphProps.minimap).toBe(true);
      expect(digraphProps.zoom).toBe(true);
      expect(digraphProps.minimapClassName).toBe('u-miniMap');
      expect(digraphProps.measurableNodesKey).toBe('nodes/content');
    });

    it('renders all required layers', () => {
      expect(digraphProps.layers).toHaveLength(5);
      expect(digraphProps.layers[0].key).toBe('nodes/find-emphasis/vector-color-band');
      expect(digraphProps.layers[1].key).toBe('nodes/find-emphasis/html');
      expect(digraphProps.layers[2].key).toBe('nodes/vector-border');
      expect(digraphProps.layers[3].key).toBe('edges');
      expect(digraphProps.layers[4].key).toBe('nodes/content');
    });

    it('de-emphasizes non-matching edges when no edgeVMs are present', () => {
      expect(digraphProps.layers[3].setOnContainer).toBe(setOnEdgesContainer.withoutViewModifiers);
    });

    it('emphasizes edges when edgeVMs are present', () => {
      cleanup();
      jest.clearAllMocks();

      render(<Graph {...props} edgesViewModifiers={new Map([[0, EViewModifier.Emphasized]])} />);
      const updatedDigraphProps = Digraph.mock.calls[Digraph.mock.calls.length - 1][0];
      expect(updatedDigraphProps.layers[3].setOnContainer).toBe(setOnEdgesContainer.withViewModifiers);
    });

    it('uses default stroke opacity when no vertexVMs are present', () => {
      expect(digraphProps.layers[2].setOnContainer).toBe(Digraph.propsFactories.scaleStrokeOpacityStrongest);
    });

    it('de-emphasizes non-matching vertices when vertexVMs are present', () => {
      cleanup();
      jest.clearAllMocks();

      render(<Graph {...props} verticesViewModifiers={new Map([[0, EViewModifier.Emphasized]])} />);
      const updatedDigraphProps = Digraph.mock.calls[Digraph.mock.calls.length - 1][0];
      expect(updatedDigraphProps.layers[2].setOnContainer).toBe(setOnVectorBorderContainerWithViewModifiers);
    });
  });

  describe('memoization', () => {
    it('memoizes node renderers when dependencies do not change', () => {
      const getNodeRenderers = require('./getNodeRenderers');

      const { rerender } = render(<Graph {...props} />);
      const firstCallCount = getNodeRenderers.mock.calls.length;

      // Re-render with same props
      rerender(<Graph {...props} />);

      // Should not call getNodeRenderers again
      expect(getNodeRenderers).toHaveBeenCalledTimes(firstCallCount);
    });

    it('recalculates node renderers when uiFindMatches changes', () => {
      const getNodeRenderers = require('./getNodeRenderers');

      const { rerender } = render(<Graph {...props} />);
      const firstCallCount = getNodeRenderers.mock.calls.length;

      // Re-render with different uiFindMatches
      rerender(<Graph {...props} uiFindMatches={new Set(['key1'])} />);

      // Should call getNodeRenderers again
      expect(getNodeRenderers.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    it('recalculates node renderers when verticesViewModifiers changes', () => {
      const getNodeRenderers = require('./getNodeRenderers');

      const { rerender } = render(<Graph {...props} />);
      const firstCallCount = getNodeRenderers.mock.calls.length;

      // Re-render with different verticesViewModifiers
      rerender(<Graph {...props} verticesViewModifiers={new Map([[0, EViewModifier.Emphasized]])} />);

      // Should call getNodeRenderers again
      expect(getNodeRenderers.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    it('recalculates setOnEdge when edgesViewModifiers changes', () => {
      const getSetOnEdge = require('./getSetOnEdge');

      const { rerender } = render(<Graph {...props} />);
      const firstCallCount = getSetOnEdge.mock.calls.length;

      // Re-render with different edgesViewModifiers
      rerender(<Graph {...props} edgesViewModifiers={new Map([[0, EViewModifier.Emphasized]])} />);

      // Should call getSetOnEdge again
      expect(getSetOnEdge.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    it('recalculates node content renderer when relevant props change', () => {
      const { getNodeRenderer } = require('./DdgNodeContent');

      const { rerender } = render(<Graph {...props} />);
      const firstCallCount = getNodeRenderer.mock.calls.length;

      // Re-render with different baseUrl
      rerender(<Graph {...props} baseUrl="/new-url" />);

      // Should call getNodeRenderer again
      expect(getNodeRenderer.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  describe('cleanup', () => {
    it('stops LayoutManager before unmounting', () => {
      const { unmount } = render(<Graph {...props} />);

      expect(mockStopAndRelease).not.toHaveBeenCalled();

      unmount();

      expect(mockStopAndRelease).toHaveBeenCalledTimes(1);
    });

    it('does not call stopAndRelease on re-renders', () => {
      const { rerender } = render(<Graph {...props} />);

      // Re-render multiple times
      rerender(<Graph {...props} edges={[...edges]} />);
      rerender(<Graph {...props} vertices={[...vertices]} />);

      // stopAndRelease should not be called during re-renders
      expect(mockStopAndRelease).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles undefined uiFindMatches by using empty set', () => {
      const getNodeRenderers = require('./getNodeRenderers');

      render(<Graph {...props} uiFindMatches={undefined} />);

      // Should be called with empty set as fallback
      const calls = getNodeRenderers.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBeInstanceOf(Set);
      expect(lastCall[0].size).toBe(0);
    });

    it('handles empty edges array', () => {
      render(<Graph {...props} edges={[]} />);
      const digraphProps = Digraph.mock.calls[Digraph.mock.calls.length - 1][0];
      expect(digraphProps.edges).toEqual([]);
    });

    it('handles empty vertices array', () => {
      render(<Graph {...props} vertices={[]} />);
      const digraphProps = Digraph.mock.calls[Digraph.mock.calls.length - 1][0];
      expect(digraphProps.vertices).toEqual([]);
    });

    it('handles empty view modifiers maps', () => {
      render(<Graph {...props} edgesViewModifiers={new Map()} verticesViewModifiers={new Map()} />);
      const digraphProps = Digraph.mock.calls[Digraph.mock.calls.length - 1][0];

      // Should use default (withoutViewModifiers) styling
      expect(digraphProps.layers[3].setOnContainer).toBe(setOnEdgesContainer.withoutViewModifiers);
      expect(digraphProps.layers[2].setOnContainer).toBe(Digraph.propsFactories.scaleStrokeOpacityStrongest);
    });
  });

  describe('React.memo optimization', () => {
    it('does not re-render when props are shallowly equal', () => {
      const { rerender } = render(<Graph {...props} />);
      const firstCallCount = Digraph.mock.calls.length;

      // Re-render with same prop object
      rerender(<Graph {...props} />);

      // Digraph should not be called again due to React.memo
      expect(Digraph.mock.calls.length).toBe(firstCallCount);
    });

    it('re-renders when props change', () => {
      const { rerender } = render(<Graph {...props} />);
      const firstCallCount = Digraph.mock.calls.length;

      // Re-render with different props
      rerender(<Graph {...props} baseUrl="/different-url" />);

      // Digraph should be called again
      expect(Digraph.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });
});
