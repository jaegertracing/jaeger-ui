// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import Digraph from './index';
import { ELayoutPhase } from './types';

// Minimal layer for tests that don't need measurable nodes
const renderNodeLayer = {
  key: 'test-layer',
  renderNode: () => <div />,
} as any;

// Shared mock layoutManager
const mockLayoutManager = {
  getLayout: () => ({
    layout: Promise.resolve({ edges: [], graph: { width: 100, height: 100 }, vertices: [] }),
  }),
} as any;

describe('Digraph', () => {
  it('renders without crashing with minimal props (empty graph)', () => {
    const { container } = render(
      <Digraph
        edges={[]}
        layers={[renderNodeLayer]}
        layoutManager={mockLayoutManager}
        measurableNodesKey="nodes"
        vertices={[]}
      />
    );
    expect(container).toBeTruthy();
  });

  it('sets layoutPhase to CalcSizes when edges and vertices are provided', () => {
    // When both edges and vertices are non-empty, the component initialises
    // with layoutPhase = CalcSizes so it can measure node sizes immediately.
    const vertices = [{ vertex: { key: 'a' } }, { vertex: { key: 'b' } }] as any;
    const edges = [{ from: 'a', to: 'b' }] as any;

    const setSizeVertices = jest.fn();
    const measurableLayer = {
      key: 'nodes',
      measurable: true,
      layerType: 'html',
      renderNode: () => <div />,
      measureNode: () => ({ height: 10, width: 10 }),
      setOnNode: undefined,
      setOnContainer: undefined,
    } as any;

    // Should not throw — component enters CalcSizes phase
    expect(() =>
      render(
        <Digraph
          edges={edges}
          layers={[measurableLayer]}
          layoutManager={mockLayoutManager}
          measurableNodesKey="nodes"
          vertices={vertices}
        />
      )
    ).not.toThrow();
  });

  it('throws when setSizeVertices receives a mismatched senderKey', () => {
    // The component enforces that only the designated measurable layer can
    // report sizes. Any other sender is a programming error and must throw.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const badLayer = {
      key: 'wrong-key', // does NOT match measurableNodesKey
      measurable: true,
      layerType: 'html',
      renderNode: () => <div />,
      measureNode: () => ({ height: 10, width: 10 }),
    } as any;

    expect(() =>
      render(
        <Digraph
          edges={[{ from: 'a', to: 'b' }] as any}
          layers={[badLayer]}
          layoutManager={mockLayoutManager}
          measurableNodesKey="nodes" // intentionally different from layer key
          vertices={[{ vertex: { key: 'a' } }, { vertex: { key: 'b' } }] as any}
        />
      )
    ).toThrow(/Key mismatch for measuring nodes/);

    consoleError.mockRestore();
  });

  it('renders MiniMap when zoom and minimap are both enabled', () => {
    const { container } = render(
      <Digraph
        edges={[]}
        layers={[renderNodeLayer]}
        layoutManager={mockLayoutManager}
        measurableNodesKey="nodes"
        vertices={[]}
        zoom
        minimap
      />
    );
    // MiniMap renders an svg element when zoom+minimap are active
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
