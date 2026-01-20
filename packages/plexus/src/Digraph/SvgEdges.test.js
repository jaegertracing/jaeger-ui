// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import SvgEdges from './SvgEdges';

// Mock SvgEdge child component
const mockSvgEdgeProps = [];
jest.mock('./SvgEdge', () => {
  const MockSvgEdge = props => {
    mockSvgEdgeProps.push(props);
    return (
      <g data-testid="svg-edge" data-from={props.layoutEdge.edge.from} data-to={props.layoutEdge.edge.to} />
    );
  };
  return MockSvgEdge;
});

describe('SvgEdges', () => {
  beforeEach(() => {
    mockSvgEdgeProps.length = 0;
  });

  const mockGetClassName = name => `plexus--${name}`;

  const mockRenderUtils = {
    getGlobalId: id => `global-${id}`,
    getZoomTransform: () => ({ k: 1, x: 0, y: 0 }),
  };

  // Create mock edges for testing
  const createMockEdge = (from, to) => ({
    edge: { from, to },
    pathPoints: [
      [0, 0],
      [100, 100],
    ],
  });

  const mockLayoutEdges = [createMockEdge('node-a', 'node-b'), createMockEdge('node-b', 'node-c')];

  // Wrap in svg container since SvgEdge renders SVG elements
  const renderInSvg = edges => {
    return render(
      <svg>
        <SvgEdges getClassName={mockGetClassName} layoutEdges={edges} renderUtils={mockRenderUtils} />
      </svg>
    );
  };

  it('renders SvgEdge for each layout edge', () => {
    const { getAllByTestId } = renderInSvg(mockLayoutEdges);
    const edges = getAllByTestId('svg-edge');
    expect(edges).toHaveLength(2);
  });

  it('renders nothing when layoutEdges is empty', () => {
    const { queryAllByTestId } = renderInSvg([]);
    const edges = queryAllByTestId('svg-edge');
    expect(edges).toHaveLength(0);
  });

  it('passes from and to correctly to SvgEdge', () => {
    const { getAllByTestId } = renderInSvg(mockLayoutEdges);
    const edges = getAllByTestId('svg-edge');

    // Check first edge
    expect(edges[0]).toHaveAttribute('data-from', 'node-a');
    expect(edges[0]).toHaveAttribute('data-to', 'node-b');

    // Check second edge
    expect(edges[1]).toHaveAttribute('data-from', 'node-b');
    expect(edges[1]).toHaveAttribute('data-to', 'node-c');
  });

  it('handles optional marker props', () => {
    const { getAllByTestId } = render(
      <svg>
        <SvgEdges
          getClassName={mockGetClassName}
          layoutEdges={mockLayoutEdges}
          renderUtils={mockRenderUtils}
          markerEndId="arrow-end"
          markerStartId="arrow-start"
        />
      </svg>
    );
    expect(getAllByTestId('svg-edge')).toHaveLength(2);
  });

  it('passes setOnEdge to child components', () => {
    const mockSetOnEdge = jest.fn();
    const { getAllByTestId } = render(
      <svg>
        <SvgEdges
          getClassName={mockGetClassName}
          layoutEdges={mockLayoutEdges}
          renderUtils={mockRenderUtils}
          setOnEdge={mockSetOnEdge}
        />
      </svg>
    );
    expect(getAllByTestId('svg-edge')).toHaveLength(2);

    // Verify setOnEdge is passed to each child component
    mockSvgEdgeProps.forEach(props => {
      expect(props.setOnEdge).toBe(mockSetOnEdge);
    });
  });
});
