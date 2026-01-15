// Copyright (c) 2026 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
import SvgEdges from './SvgEdges';

// Track props passed to mocked SvgEdge component
const mockSvgEdgeProps = [];

jest.mock('./SvgEdge', () => {
  const MockSvgEdge = props => {
    mockSvgEdgeProps.push(props);
    return <path data-testid={`edge-${props.layoutEdge.edge.from}-${props.layoutEdge.edge.to}`} />;
  };
  return MockSvgEdge;
});

// Mock isSamePropSetter for testing comparison logic
let mockIsSamePropSetterReturn = true;
jest.mock('./utils', () => ({
  isSamePropSetter: (a, b) => mockIsSamePropSetterReturn,
}));

describe('SvgEdges', () => {
  const createLayoutEdge = (from, to, label = undefined) => ({
    edge: { from, to, label },
    pathPoints: [
      [0, 0],
      [100, 100],
    ],
  });

  const defaultProps = {
    getClassName: name => `test-${name}`,
    layoutEdges: [createLayoutEdge('a', 'b'), createLayoutEdge('b', 'c'), createLayoutEdge('c', 'd')],
    renderUtils: {
      getGlobalId: id => `global-${id}`,
    },
  };

  beforeEach(() => {
    mockSvgEdgeProps.length = 0;
    mockIsSamePropSetterReturn = true;
  });

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      expect(container).toBeTruthy();
    });

    it('renders an SvgEdge for each layout edge', () => {
      render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      expect(mockSvgEdgeProps.length).toBe(3);
    });

    it('renders edges with correct keys', () => {
      const { getAllByTestId } = render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      expect(getAllByTestId(/^edge-/)).toHaveLength(3);
    });
  });

  describe('props passed to SvgEdge', () => {
    it('passes getClassName to each SvgEdge', () => {
      render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      mockSvgEdgeProps.forEach(props => {
        expect(props.getClassName).toBe(defaultProps.getClassName);
      });
    });

    it('passes correct layoutEdge to each SvgEdge', () => {
      render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      expect(mockSvgEdgeProps[0].layoutEdge.edge.from).toBe('a');
      expect(mockSvgEdgeProps[0].layoutEdge.edge.to).toBe('b');
      expect(mockSvgEdgeProps[1].layoutEdge.edge.from).toBe('b');
      expect(mockSvgEdgeProps[1].layoutEdge.edge.to).toBe('c');
      expect(mockSvgEdgeProps[2].layoutEdge.edge.from).toBe('c');
      expect(mockSvgEdgeProps[2].layoutEdge.edge.to).toBe('d');
    });

    it('passes markerEndId to each SvgEdge', () => {
      render(
        <svg>
          <SvgEdges {...defaultProps} markerEndId="arrow-end" />
        </svg>
      );
      mockSvgEdgeProps.forEach(props => {
        expect(props.markerEndId).toBe('arrow-end');
      });
    });

    it('passes markerStartId to each SvgEdge', () => {
      render(
        <svg>
          <SvgEdges {...defaultProps} markerStartId="arrow-start" />
        </svg>
      );
      mockSvgEdgeProps.forEach(props => {
        expect(props.markerStartId).toBe('arrow-start');
      });
    });

    it('passes renderUtils to each SvgEdge', () => {
      render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      mockSvgEdgeProps.forEach(props => {
        expect(props.renderUtils).toBe(defaultProps.renderUtils);
      });
    });

    it('passes setOnEdge to each SvgEdge', () => {
      const mockSetOnEdge = jest.fn();
      render(
        <svg>
          <SvgEdges {...defaultProps} setOnEdge={mockSetOnEdge} />
        </svg>
      );
      mockSvgEdgeProps.forEach(props => {
        expect(props.setOnEdge).toBe(mockSetOnEdge);
      });
    });

    it('passes label from edge to SvgEdge', () => {
      const edgesWithLabels = [createLayoutEdge('a', 'b', 'Label 1'), createLayoutEdge('b', 'c', 'Label 2')];
      render(
        <svg>
          <SvgEdges {...defaultProps} layoutEdges={edgesWithLabels} />
        </svg>
      );
      expect(mockSvgEdgeProps[0].label).toBe('Label 1');
      expect(mockSvgEdgeProps[1].label).toBe('Label 2');
    });
  });

  describe('edge key generation', () => {
    it('generates unique keys using from and to with vertical tab separator', () => {
      // The key format is `${layoutEdge.edge.from}\v${layoutEdge.edge.to}` where \v is vertical tab
      const { container } = render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      // If keys are unique, all 3 edges should render
      expect(container.querySelectorAll('[data-testid^="edge-"]').length).toBe(3);
    });
  });

  describe('memoization with custom comparison', () => {
    it('is wrapped with React.memo', () => {
      expect(SvgEdges.$$typeof).toBeDefined();
    });

    it('re-renders when getClassName changes', () => {
      const { rerender } = render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      const initialCount = mockSvgEdgeProps.length;

      const newGetClassName = name => `new-${name}`;
      rerender(
        <svg>
          <SvgEdges {...defaultProps} getClassName={newGetClassName} />
        </svg>
      );

      expect(mockSvgEdgeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when layoutEdges changes', () => {
      const { rerender } = render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      const initialCount = mockSvgEdgeProps.length;

      const newEdges = [createLayoutEdge('x', 'y')];
      rerender(
        <svg>
          <SvgEdges {...defaultProps} layoutEdges={newEdges} />
        </svg>
      );

      expect(mockSvgEdgeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when markerEndId changes', () => {
      const { rerender } = render(
        <svg>
          <SvgEdges {...defaultProps} markerEndId="old-marker" />
        </svg>
      );
      const initialCount = mockSvgEdgeProps.length;

      rerender(
        <svg>
          <SvgEdges {...defaultProps} markerEndId="new-marker" />
        </svg>
      );

      expect(mockSvgEdgeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when markerStartId changes', () => {
      const { rerender } = render(
        <svg>
          <SvgEdges {...defaultProps} markerStartId="old-marker" />
        </svg>
      );
      const initialCount = mockSvgEdgeProps.length;

      rerender(
        <svg>
          <SvgEdges {...defaultProps} markerStartId="new-marker" />
        </svg>
      );

      expect(mockSvgEdgeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when renderUtils changes', () => {
      const { rerender } = render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      const initialCount = mockSvgEdgeProps.length;

      const newRenderUtils = { getGlobalId: id => `new-${id}` };
      rerender(
        <svg>
          <SvgEdges {...defaultProps} renderUtils={newRenderUtils} />
        </svg>
      );

      expect(mockSvgEdgeProps.length).toBeGreaterThan(initialCount);
    });

    it('re-renders when setOnEdge changes (via isSamePropSetter)', () => {
      const { rerender } = render(
        <svg>
          <SvgEdges {...defaultProps} setOnEdge={() => null} />
        </svg>
      );
      const initialCount = mockSvgEdgeProps.length;

      mockIsSamePropSetterReturn = false;
      rerender(
        <svg>
          <SvgEdges {...defaultProps} setOnEdge={() => ({ custom: true })} />
        </svg>
      );

      expect(mockSvgEdgeProps.length).toBeGreaterThan(initialCount);
    });

    it('does not re-render when props are the same', () => {
      const { rerender } = render(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );
      const initialCount = mockSvgEdgeProps.length;

      rerender(
        <svg>
          <SvgEdges {...defaultProps} />
        </svg>
      );

      expect(mockSvgEdgeProps.length).toBe(initialCount);
    });
  });

  describe('empty layoutEdges', () => {
    it('renders nothing when layoutEdges is empty', () => {
      const { container } = render(
        <svg>
          <SvgEdges {...defaultProps} layoutEdges={[]} />
        </svg>
      );
      expect(container.querySelectorAll('[data-testid^="edge-"]').length).toBe(0);
    });
  });
});
