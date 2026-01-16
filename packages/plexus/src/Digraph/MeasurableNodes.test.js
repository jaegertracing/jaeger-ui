// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import MeasurableNodes from './MeasurableNodes';
import { ELayerType } from './types';

// Mock MeasurableNode child component
// Note: jest.mock factory cannot use JSX (compiled to _jsx which is out of scope)
// Must use React.createElement and require('react') inside the factory
const mockMeasurableNodeProps = [];
jest.mock('./MeasurableNode', () => {
  const React = require('react');
  return function MockMeasurableNode(props) {
    mockMeasurableNodeProps.push(props);
    return React.createElement('div', {
      'data-testid': 'measurable-node',
      'data-vertex-key': props.vertex.key,
      'data-hidden': props.hidden.toString(),
    });
  };
});

describe('MeasurableNodes', () => {
  const mockGetClassName = name => `plexus--${name}`;

  const mockRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };

  const mockRenderNode = () => <span>node content</span>;

  // Create test vertex
  const createVertex = key => ({ key });

  const createLayoutVertex = key => ({
    vertex: { key },
    height: 50,
    width: 100,
    left: 10,
    top: 20,
  });

  const mockVertices = [createVertex('v-a'), createVertex('v-b'), createVertex('v-c')];

  const mockLayoutVertices = [
    createLayoutVertex('v-a'),
    createLayoutVertex('v-b'),
    createLayoutVertex('v-c'),
  ];

  // Create refs array
  const createNodeRefs = count => Array.from({ length: count }, () => React.createRef());

  const defaultProps = {
    getClassName: mockGetClassName,
    layerType: ELayerType.Html,
    layoutVertices: mockLayoutVertices,
    nodeRefs: createNodeRefs(3),
    renderNode: mockRenderNode,
    renderUtils: mockRenderUtils,
    vertices: mockVertices,
  };

  it('renders MeasurableNode for each vertex', () => {
    const { getAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('measurable-node');
    expect(nodes).toHaveLength(3);
  });

  it('renders nothing when vertices is empty', () => {
    const { queryAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} vertices={[]} nodeRefs={[]} />
      </div>
    );
    const nodes = queryAllByTestId('measurable-node');
    expect(nodes).toHaveLength(0);
  });

  it('passes vertex key correctly', () => {
    const { getAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('measurable-node');

    expect(nodes[0]).toHaveAttribute('data-vertex-key', 'v-a');
    expect(nodes[1]).toHaveAttribute('data-vertex-key', 'v-b');
    expect(nodes[2]).toHaveAttribute('data-vertex-key', 'v-c');
  });

  it('sets hidden=true when layoutVertices is null', () => {
    const { getAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} layoutVertices={null} />
      </div>
    );
    const nodes = getAllByTestId('measurable-node');

    nodes.forEach(node => {
      expect(node).toHaveAttribute('data-hidden', 'true');
    });
  });

  it('sets hidden=false when layoutVertices is provided', () => {
    const { getAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} />
      </div>
    );
    const nodes = getAllByTestId('measurable-node');

    nodes.forEach(node => {
      expect(node).toHaveAttribute('data-hidden', 'false');
    });
  });

  it('passes setOnNode to child components', () => {
    mockMeasurableNodeProps.length = 0;
    const mockSetOnNode = jest.fn();
    const { getAllByTestId } = render(
      <div>
        <MeasurableNodes {...defaultProps} setOnNode={mockSetOnNode} />
      </div>
    );
    expect(getAllByTestId('measurable-node')).toHaveLength(3);

    // Verify setOnNode is passed to each child component
    mockMeasurableNodeProps.forEach(props => {
      expect(props.setOnNode).toBe(mockSetOnNode);
    });
  });
});
