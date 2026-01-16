// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import Nodes from './Nodes';
import { ELayerType } from './types';

// Mock Node child component
// Note: jest.mock factory cannot use JSX (compiled to _jsx which is out of scope)
// Must use React.createElement and require('react') inside the factory
const mockNodeProps = [];
jest.mock('./Node', () => {
  const React = require('react');
  const MockNode = props => {
    mockNodeProps.push(props);
    return React.createElement('div', {
      'data-testid': 'node',
      'data-vertex-key': props.layoutVertex.vertex.key,
      'data-layer-type': props.layerType,
    });
  };
  return MockNode;
});

describe('Nodes', () => {
  const mockGetClassName = name => `plexus--${name}`;

  const mockRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };

  const mockRenderNode = () => <span>node content</span>;

  // Create mock layoutVertex for testing
  const createLayoutVertex = key => ({
    vertex: { key },
    height: 50,
    width: 100,
    left: 10,
    top: 20,
  });

  const mockLayoutVertices = [
    createLayoutVertex('vertex-a'),
    createLayoutVertex('vertex-b'),
    createLayoutVertex('vertex-c'),
  ];

  const defaultProps = {
    getClassName: mockGetClassName,
    layerType: ELayerType.Html,
    layoutVertices: mockLayoutVertices,
    renderNode: mockRenderNode,
    renderUtils: mockRenderUtils,
  };

  it('renders Node for each layout vertex', () => {
    const { getAllByTestId } = render(
      <div>
        <Nodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('node');
    expect(nodes).toHaveLength(3);
  });

  it('renders nothing when layoutVertices is empty', () => {
    const { queryAllByTestId } = render(
      <div>
        <Nodes {...defaultProps} layoutVertices={[]} />
      </div>
    );
    const nodes = queryAllByTestId('node');
    expect(nodes).toHaveLength(0);
  });

  it('passes vertex key correctly to Node', () => {
    const { getAllByTestId } = render(
      <div>
        <Nodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('node');

    expect(nodes[0]).toHaveAttribute('data-vertex-key', 'vertex-a');
    expect(nodes[1]).toHaveAttribute('data-vertex-key', 'vertex-b');
    expect(nodes[2]).toHaveAttribute('data-vertex-key', 'vertex-c');
  });

  it('passes layerType correctly to Node', () => {
    const { getAllByTestId } = render(
      <div>
        <Nodes {...defaultProps} layerType={ELayerType.Svg} />
      </div>
    );
    const nodes = getAllByTestId('node');

    nodes.forEach(node => {
      expect(node).toHaveAttribute('data-layer-type', ELayerType.Svg);
    });
  });

  it('passes setOnNode to child components', () => {
    mockNodeProps.length = 0;
    const mockSetOnNode = jest.fn();
    const { getAllByTestId } = render(
      <div>
        <Nodes {...defaultProps} setOnNode={mockSetOnNode} />
      </div>
    );
    expect(getAllByTestId('node')).toHaveLength(3);

    // Verify setOnNode is passed to each child component
    mockNodeProps.forEach(props => {
      expect(props.setOnNode).toBe(mockSetOnNode);
    });
  });
});
